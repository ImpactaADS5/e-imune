# Banco de dados — e-imune

Entrega S0 (JP). Contrato para Aylon, Gustavo, PH e Endrew. Schema em `prisma/schema.prisma`.

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

Credenciais vêm do `docker-compose.yml` (`eimune` / `eimune123` / `eimune_db`, porta **6032**).

## Decisão de migração

**RESET + RESEED.** Não havia dado de produção. As tabelas `paciente`, `vacina` e `aplicacao` (IDs `Int`) foram trocadas pelos modelos abaixo (`uuid`).

Migration atual: `prisma/migrations/20260831223822_init_eimune_v2`.

## Modelos

```
User ── Session
     ├── PasswordResetToken
     ├── VaccineRecord ── Vaccine ── CampaignVaccines ── Campaign
     └── Reminder ── (opcional) VaccineRecord
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
| notificationPreferences | notification_preferences | json | `{"push":true,"email":true,"whatsapp":false}` |
| role | role | string | `USER` \| `ADMIN` |
| criadoEm / atualizadoEm | criado_em / atualizado_em | datetime | |

### Session — Aylon

`jti` único (id do JWT), `userAgent`, `ip`, `expiraEm`, `revogadoEm`. Cascade no user.

### PasswordResetToken — Aylon

Guarda **hash** do token, `expiraEm`, `usadoEm`. Cascade no user.

### Vaccine — Gustavo

Catálogo: `nome`, `fabricante`, `dosesNecessarias`, `intervaloDias`, `descricao`.

### VaccineRecord — Gustavo

Aplicação: `userId`, `vaccineId`, `numeroDose`, `dataAplicacao`, `dataProximaDose`, `lote`, `local`, `comprovanteUrl`.

Apagar vacina com histórico é **RESTRICT**. Apagar user **CASCADE**.

Status da UI (aplicada / pendente / atrasada) **não é coluna**. Calcula:

- aplicada → existe record
- pendente → `dataProximaDose` no futuro
- atrasada → `dataProximaDose` no passado
- % da Home → doses registradas / soma de `dosesNecessarias`

### Reminder — Gustavo

`titulo`, `descricao`, `agendadoPara`, `antecedenciaHoras` (default 24), `canal` (`push` \| `email` \| `whatsapp`), `status` (`pending` \| `sent` \| `cancelled`).

`vaccineRecordId` é opcional (`ON DELETE SET NULL`).

### Campaign + CampaignVaccines — Gustavo

Campanha N:N com vacinas. `destaque`, `dataInicio`, `dataFim`, `imagemUrl`.

### Clinic — Gustavo

`nome`, `endereco`, `cidade`, `estado` (CHAR 2), `cep`, `latitude`, `longitude`, `telefone`, `horario`. Distância não grava — calcula com lat/lng.

## Seed

`prisma/seed.ts`. IDs fixos. Rodar de novo **apaga** os dados e recria.

| Dado | Qtde | Detalhe |
|---|---|---|
| users | 2 | `admin@eimune.test` / `Admin123!` (ADMIN), `user@eimune.test` / `User123!` |
| vacinas | 6 | COVID, Influenza, Hepatite B, Tríplice Viral, Febre Amarela, HPV |
| campanhas | 3 | 1 em destaque (Influenza) |
| clínicas | 5 | SP capital, lat/lng reais |
| records | 4 | no user: 2 completas, 1 atrasada (Hep B), 1 próxima (COVID) |

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
```

## O que não está no banco (de propósito)

| Pedido da UI | Como resolve |
|---|---|
| Confirmar senha | só no front |
| Observações da vacina | fora do contrato S0 |
| Foto de perfil | fora do contrato S0 |
| Toggles (dicas, resumo semanal…) | contrato é `{ push, email, whatsapp }` |
| Distância da clínica | cálculo |
| Status aplicada/pendente | cálculo |
