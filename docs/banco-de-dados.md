# Banco de dados — e-imune

Entrega S0 + ajustes da AC2 e da AC3 (JP). Contrato para Aylon, Gustavo, PH e Endrew. Schema em `prisma/schema.prisma`.

## Como sobe

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:setup
```

`.env` (não commitar):

```env
DATABASE_URL="postgresql://eimune:eimune123@localhost:6032/eimune_db?schema=public"
```

Credenciais vêm do `docker-compose.yml`: usuário `eimune`, senha `eimune123`, banco `eimune_db`, porta **6032**.

Passo a passo completo e erros comuns da instalação (`P3005`, `P1001`, porta ocupada): [README](../README.md#iniciar-o-projeto).

## Decisão de migração

**RESET + RESEED.** Não havia dado de produção. As tabelas `paciente`, `vacina` e `aplicacao` (IDs `Int`) foram trocadas pelos modelos abaixo (`uuid`).

Migrations (`prisma/migrations`):

| Migration | Entrega | O que faz |
|---|---|---|
| `20260831223822_init_eimune_v2` | S0 | cria todas as tabelas |
| `20261012120000_add_vaccine_record_observacoes` | AC2 | `vaccine_record.observacoes` |
| `20261012130000_add_vaccine_record_atualizado_em` | AC2 | `vaccine_record.atualizado_em` |
| `20261104120000_ac3_lembretes_campanhas_preferencias` | AC3 | lembrete por registro, `campaign.publico_alvo`, novas preferências de notificação |

Mudou o schema? Gere a migration junto (`npm run db:migrate`) e commite as duas coisas. Campo no schema sem migration quebra o banco de quem clonar.

## Modelos

```
User ── Session
     ├── PasswordResetToken
     ├── VaccineRecord ── Vaccine ── CampaignVaccines ── Campaign
     └── Reminder ── VaccineRecord (1 lembrete por registro)
Clinic   isolada (geo)
```

Diagrama: [prisma/ERD.md](../prisma/ERD.md).

### User — Aylon

| Campo | Coluna | Tipo | Notas |
|---|---|---|---|
| id | id | uuid | PK |
| email | email | string unique | login |
| passwordHash | password_hash | string | bcrypt 12 |
| nome | nome | string | |
| cpf | cpf | string? unique | |
| telefone | telefone | string? | |
| dataNascimento | data_nascimento | datetime? | |
| twoFactorSecret | 2fa_secret | string? | |
| twoFactorEnabled | 2fa_enabled | boolean | default false |
| notificationPreferences | notification_preferences | json | `{"alertas":true,"proximasDoses":true,"campanhas":true,"dicas":false,"resumoSemanal":false}` (AC3, uma chave por toggle da tela Preferências) |
| role | role | string | `USER` \| `ADMIN` |
| criadoEm / atualizadoEm | criado_em / atualizado_em | datetime | |

### Session — Aylon

`jti` único (id do JWT), `userAgent`, `ip`, `expiraEm`, `revogadoEm`. Cascade no user.

### PasswordResetToken — Aylon

Guarda **hash** do token, `expiraEm`, `usadoEm`. Cascade no user.

### Vaccine — Gustavo

Catálogo: `nome`, `fabricante`, `dosesNecessarias`, `intervaloDias`, `descricao`.

### VaccineRecord — Gustavo

Aplicação: `userId`, `vaccineId`, `numeroDose`, `dataAplicacao`, `dataProximaDose`, `lote`, `local`, `observacoes`, `comprovanteUrl`, `criadoEm`, `atualizadoEm`.

AC2: `observacoes` (texto livre, opcional; a API limita a 200 caracteres) e `atualizadoEm` (coluna `atualizado_em`, preenchida pelo Prisma a cada edição).

Apagar vacina com histórico é **RESTRICT**. Apagar user **CASCADE**.

Status da UI (aplicada / pendente / atrasada) **não é coluna**. Calcula:

- aplicada → existe record
- pendente → `dataProximaDose` no futuro
- atrasada → `dataProximaDose` no passado
- % da Home → doses registradas / soma de `dosesNecessarias` do catálogo inteiro
- por vacina vale só o record mais recente: registrar a dose seguinte resolve a pendência anterior

Badges da tela Próximas Doses (dias até `dataProximaDose`): `OVERDUE` < 0, `DUE_SOON` 0–7, `UPCOMING` 8–30, `SCHEDULED` > 30. Regra em `src/services/vaccine-progress.service.ts`.

### Reminder — Gustavo (AC3)

Um lembrete por registro de vacina (`vaccine_record_id` único). Apagar o registro apaga o lembrete (`ON DELETE CASCADE`).

| Campo | Coluna | Tipo | Notas |
|---|---|---|---|
| vaccineRecordId | vaccine_record_id | uuid unique | registro que tem a próxima dose |
| ativo | ativo | boolean | toggle da tela Lembrete, default true |
| antecedenciaDias | antecedencia_dias | int | 0 a 30 (validado na API), default 1 |
| horario | horario | varchar(5) | `HH:mm` no horário de São Paulo, default `09:00` |
| lidoPara | lido_para | string? | disparo que o usuário já marcou como visto |
| criadoEm / atualizadoEm | criado_em / atualizado_em | datetime | |

O momento do disparo **não é coluna**. Calcula: `data_proxima_dose` do registro − `antecedencia_dias`, às `horario`. Editar a data da próxima dose reagenda sozinho.

Status da UI (calculado, não gravado): `DESATIVADO` (toggle desligado), `SEM_DATA` (registro sem próxima dose), `AGENDADO` (disparo no futuro), `PENDENTE` (disparo já passou e não foi visto), `LIDO` (`lido_para` igual ao disparo atual). Regra em `src/services/reminder.service.ts`.

### Campaign + CampaignVaccines — Gustavo

Campanha N:N com vacinas. `destaque`, `publicoAlvo` (AC3), `dataInicio`, `dataFim`, `imagemUrl`.

"Em destaque" para a Home = `destaque = true` e hoje entre `dataInicio` e `dataFim`. A API devolve as datas como `inicio` e `fim`.

### Clinic — Gustavo

`nome`, `endereco`, `cidade`, `estado` (CHAR 2), `cep`, `latitude`, `longitude`, `telefone`, `horario`. Distância não grava — calcula com lat/lng (Haversine, com pré-filtro por retângulo no índice `latitude, longitude`). A API devolve `estado` como `uf`.

## Seed

`prisma/seed.ts`. IDs fixos. Rodar de novo **apaga** os dados e recria. Datas de records e campanhas são relativas ao dia em que o seed roda, então o cenário não envelhece.

| Dado | Qtde | Detalhe |
|---|---|---|
| users | 2 | `admin@eimune.test` / `Admin123!` (ADMIN), `user@eimune.test` / `User123!` |
| vacinas | 6 | COVID, Influenza, Hepatite B, Tríplice Viral, Febre Amarela, HPV |
| campanhas | 3 | 2 em destaque (Influenza, Multivacinação), todas vigentes e com público-alvo |
| clínicas | 5 | SP capital, lat/lng reais |
| records | 7 | no user, 64% de progresso — ver tabela abaixo |
| lembretes | 3 | no user — ver tabela abaixo |

Cenário do `user@eimune.test` (AC2):

| Vacina | Doses registradas | Próxima dose | Status esperado |
|---|---|---|---|
| Influenza | 1 de 1 | — | completa |
| Febre Amarela | 1 de 1 | — | completa |
| Hepatite B | 2 de 3 | venceu há 20 dias | `OVERDUE` (atrasada) |
| Tríplice Viral | 1 de 2 | em 5 dias | `DUE_SOON` |
| COVID-19 | 1 de 2 | em 18 dias | `UPCOMING` |
| HPV | 1 de 2 | em 120 dias | `SCHEDULED` |

Lembretes do `user@eimune.test` (AC3):

| Registro | Configuração | Status esperado |
|---|---|---|
| Hepatite B, dose 2 | ativo, 1 dia antes às 09:00 | `PENDENTE` (aparece em `/reminders/due`) |
| COVID-19, dose 1 | ativo, 3 dias antes às 08:30 | `AGENDADO` |
| Tríplice Viral, dose 1 | desligado | `DESATIVADO` |

## Uso no código

```ts
import { prisma } from "../lib/prisma";
```

Único ponto de conexão (Prisma 7 + adapter `pg`). Não instancie `PrismaClient` em outro arquivo.

```bash
npm run db:generate   # gera o client
npm run db:migrate    # nova migration (dev)
npm run db:deploy     # aplica migrations existentes
npm run db:seed
npm run db:studio
npm test              # precisa do banco no ar (cria e apaga os próprios dados)
```

## O que não está no banco (de propósito)

| Pedido da UI | Como resolve |
|---|---|
| Confirmar senha | só no front |
| Foto de perfil | fora do contrato S0 |
| Distância da clínica | cálculo |
| Status aplicada/pendente | cálculo |
| Momento do disparo do lembrete | cálculo (próxima dose − antecedência) |
| Envio de push / e-mail / WhatsApp | fora do escopo: o app mostra os pendentes (`/reminders/due`) |
