# Documentação Técnica do Banco de Dados — e-imune

**Responsável:** João Pedro (JP) · **Atualizado em:** 08/11/2026 · **Repositório:** [ImpactaADS5/e-imune](https://github.com/ImpactaADS5/e-imune)

O banco do e-imune é um PostgreSQL 16 acessado pelo Prisma 7. São 9 tabelas, criadas e evoluídas em 4 migrations entre a S0 e a AC3. Ele guarda usuários e sessões, o catálogo de vacinas, as doses aplicadas, os lembretes, as campanhas e as clínicas.

---

## 1. Visão geral

| Item | Valor |
|---|---|
| SGBD | PostgreSQL 16 (imagem `postgres:16`, container `eimune-postgres`) |
| ORM | Prisma 7 com adapter `@prisma/adapter-pg` |
| Banco | `eimune_db`, schema `public` |
| Porta local | `6032` (mapeada para a `5432` do container) |
| Usuário / senha (dev) | `eimune` / `eimune123` |
| Schema | `prisma/schema.prisma` |
| Migrations | `prisma/migrations/` |
| Seed | `prisma/seed.ts` |
| Ponto único de conexão | `src/lib/prisma.ts` |

**Convenções**

- Chaves primárias e estrangeiras são `text` no PostgreSQL, com valor UUID gerado pelo Prisma (`@default(uuid())`).
- No código os campos ficam em camelCase (`dataAplicacao`); no banco, em snake_case (`data_aplicacao`), via `@map`. Tabelas no singular (`vaccine_record`), via `@@map`.
- Toda tabela, exceto `campaign_vaccines`, tem `criado_em` (padrão now()); `user`, `vaccine_record` e `reminder` têm também `atualizado_em`, preenchido pelo Prisma (`@updatedAt`), sem padrão no banco.
- Datas "só dia" (aplicação, próxima dose, campanha) são gravadas à meia-noite UTC e tratadas no fuso de São Paulo pela API.
- Status, progresso, distância e momento de disparo **não são gravados**: são calculados a partir das datas (seção 4).

**Política de migração:** a S0 fez *reset + reseed*. As tabelas legadas `paciente`, `vacina` e `aplicacao` (IDs `Int`) foram substituídas, pois não havia dado de produção. Desde então, toda mudança de schema vem com a sua migration no mesmo commit.

---

## 2. Modelo de dados

![MER do e-Imune](diagramas/mer.png)

Diagramas do sistema: [MER](diagramas/mer.png) · [diagrama de classes](diagramas/diagrama-de-classes.png) · [diagrama de casos de uso](diagramas/diagrama-de-casos-de-uso.png).

A versão em texto abaixo é desenhada pelo próprio GitHub:

```mermaid
erDiagram
  USER ||--o{ SESSION : "tem"
  USER ||--o{ PASSWORD_RESET_TOKEN : "tem"
  USER ||--o{ VACCINE_RECORD : "registra"
  USER ||--o{ REMINDER : "tem"
  VACCINE ||--o{ VACCINE_RECORD : "aplicada em"
  VACCINE_RECORD ||--o| REMINDER : "tem no máximo 1"
  VACCINE ||--o{ CAMPAIGN_VACCINES : "faz parte"
  CAMPAIGN ||--o{ CAMPAIGN_VACCINES : "inclui"

  USER {
    text id PK
    string email UK
    string password_hash
    string nome
    string cpf UK
    json notification_preferences
    string role
  }
  SESSION {
    text id PK
    text user_id FK
    string jti UK
    datetime expira_em
    datetime revogado_em
  }
  PASSWORD_RESET_TOKEN {
    text id PK
    text user_id FK
    string token_hash UK
    datetime expira_em
    datetime usado_em
  }
  VACCINE {
    text id PK
    string nome
    int doses_necessarias
    int intervalo_dias
  }
  VACCINE_RECORD {
    text id PK
    text user_id FK
    text vaccine_id FK
    int numero_dose
    datetime data_aplicacao
    datetime data_proxima_dose
  }
  REMINDER {
    text id PK
    text user_id FK
    text vaccine_record_id FK,UK
    boolean ativo
    int antecedencia_dias
    string horario
  }
  CAMPAIGN {
    text id PK
    string titulo
    boolean destaque
    datetime data_inicio
    datetime data_fim
  }
  CAMPAIGN_VACCINES {
    text campaign_id PK,FK
    text vaccine_id PK,FK
  }
  CLINIC {
    text id PK
    string nome
    char estado
    float latitude
    float longitude
  }
```

`clinic` não tem relacionamento: é consultada por latitude e longitude. O diagrama também está em `prisma/ERD.md` (o GitHub desenha o Mermaid automaticamente).

### Relacionamentos e exclusão

| Origem → destino | Cardinalidade | Ao apagar o destino | Motivo |
|---|---|---|---|
| `session.user_id` → `user` | N:1 | CASCADE | sessão não existe sem usuário |
| `password_reset_token.user_id` → `user` | N:1 | CASCADE | idem |
| `vaccine_record.user_id` → `user` | N:1 | CASCADE | o histórico é do usuário |
| `vaccine_record.vaccine_id` → `vaccine` | N:1 | RESTRICT | não se apaga vacina que já tem histórico |
| `reminder.user_id` → `user` | N:1 | CASCADE | |
| `reminder.vaccine_record_id` → `vaccine_record` | 1:0..1 | CASCADE | o lembrete existe só para aquele registro |
| `campaign_vaccines` → `campaign` e `vaccine` | N:N | CASCADE | tabela de ligação |

---

## 3. Dicionário de dados

### 3.1 `user` — usuários

| Coluna | Tipo | Obrig. | Padrão | Restrição / observação |
|---|---|---|---|---|
| id | text | sim | gerado | PK |
| email | text | sim | | único; usado no login |
| password_hash | text | sim | | bcrypt com custo 12; a senha nunca é gravada |
| nome | text | sim | | |
| cpf | text | não | | único |
| telefone | text | não | | |
| data_nascimento | timestamp | não | | |
| 2fa_secret | text | não | | reservado para o 2FA, que ainda não foi implementado (a rota responde 501) |
| 2fa_enabled | boolean | sim | false | idem; hoje sempre false |
| notification_preferences | jsonb | sim | ver abaixo | uma chave por toggle da tela Preferências |
| role | text | sim | `USER` | `USER` ou `ADMIN` |
| criado_em / atualizado_em | timestamp | sim | `criado_em`: now() | |

Padrão de `notification_preferences`: `{"alertas": true, "proximasDoses": true, "campanhas": true, "dicas": false, "resumoSemanal": false}`.

### 3.2 `session` — sessões de login

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| user_id | text | sim | FK → `user`, índice |
| jti | text | sim | único; id do token JWT |
| user_agent | text | não | navegador do login |
| ip | text | não | |
| criado_em | timestamp | sim | padrão now() |
| expira_em | timestamp | sim | |
| revogado_em | timestamp | não | preenchido no logout ou ao encerrar a sessão |

Uma requisição só é aceita se a sessão do `jti` existir, não estiver revogada e não tiver expirado.

### 3.3 `password_reset_token` — recuperação de senha

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| user_id | text | sim | FK → `user`, índice |
| token_hash | text | sim | único; guarda o hash, nunca o token |
| expira_em | timestamp | sim | |
| usado_em | timestamp | não | uso único |
| criado_em | timestamp | sim | padrão now() |

### 3.4 `vaccine` — catálogo de vacinas

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| nome | text | sim | |
| fabricante | text | não | |
| doses_necessarias | integer | sim | doses do esquema; base do progresso |
| intervalo_dias | integer | sim | intervalo entre doses |
| descricao | text | não | |
| criado_em | timestamp | sim | padrão now() |

### 3.5 `vaccine_record` — doses aplicadas

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| user_id | text | sim | FK → `user` (CASCADE), índice |
| vaccine_id | text | sim | FK → `vaccine` (RESTRICT), índice |
| numero_dose | integer | sim | 1, 2, 3…; acima do esquema = reforço |
| data_aplicacao | timestamp | sim | não pode ser futura (validado na API) |
| data_proxima_dose | timestamp | não | deve ser depois da aplicação; alimenta Próximas Doses e o lembrete |
| lote | text | não | até 100 caracteres (API) |
| local | text | não | até 200 caracteres (API) |
| observacoes | text | não | até 200 caracteres (API) — AC2 |
| comprovante_url | text | não | |
| criado_em | timestamp | sim | padrão now() |
| atualizado_em | timestamp | sim | atualizado a cada edição — AC2 |

### 3.6 `reminder` — lembretes (AC3)

| Coluna | Tipo | Obrig. | Padrão | Restrição / observação |
|---|---|---|---|---|
| id | text | sim | gerado | PK |
| user_id | text | sim | | FK → `user` (CASCADE), índice |
| vaccine_record_id | text | sim | | FK → `vaccine_record` (CASCADE), **único**: um lembrete por registro |
| ativo | boolean | sim | true | toggle da tela Lembrete |
| antecedencia_dias | integer | sim | 1 | 0 a 30 (validado na API) |
| horario | varchar(5) | sim | `09:00` | `HH:mm`, horário de São Paulo |
| lido_para | text | não | | disparo que o usuário já marcou como visto |
| criado_em / atualizado_em | timestamp | sim | `criado_em`: now() | |

### 3.7 `campaign` — campanhas de vacinação

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| titulo | text | sim | |
| descricao | text | sim | |
| destaque | boolean | sim | padrão false; aparece na Home se vigente |
| publico_alvo | text | não | AC3 |
| data_inicio / data_fim | timestamp | sim | período da campanha |
| imagem_url | text | não | |
| criado_em | timestamp | sim | padrão now() |

Índice: `(destaque, data_fim)`, usado na busca de campanhas em destaque.

### 3.8 `campaign_vaccines` — vacinas de cada campanha

| Coluna | Tipo | Restrição |
|---|---|---|
| campaign_id | text | PK composta, FK → `campaign` (CASCADE) |
| vaccine_id | text | PK composta, FK → `vaccine` (CASCADE) |

### 3.9 `clinic` — clínicas e postos

| Coluna | Tipo | Obrig. | Restrição / observação |
|---|---|---|---|
| id | text | sim | PK |
| nome | text | sim | |
| endereco | text | sim | |
| cidade | text | sim | |
| estado | char(2) | sim | UF; a API devolve como `uf` |
| cep | text | sim | |
| latitude / longitude | double precision | sim | índice `(latitude, longitude)` |
| telefone | text | não | |
| horario | text | não | horário de funcionamento |
| criado_em | timestamp | sim | padrão now() |

### 3.10 Índices

| Tabela | Índice | Tipo | Uso |
|---|---|---|---|
| user | email, cpf | único | login e cadastro |
| session | jti | único | validar o token em toda requisição |
| session | user_id | comum | listar sessões do usuário |
| password_reset_token | token_hash | único | conferir o link de recuperação |
| vaccine_record | user_id, vaccine_id | comum | histórico e progresso do usuário |
| reminder | vaccine_record_id | único | garantir um lembrete por registro |
| reminder | user_id | comum | lista de lembretes e sino da Home |
| campaign | (destaque, data_fim) | comum | campanhas em destaque |
| clinic | (latitude, longitude) | comum | pré-filtro de clínicas próximas |

---

## 4. Regras calculadas (não gravadas)

| Informação | Como é calculada | Onde está a regra |
|---|---|---|
| Dose aplicada | existe registro em `vaccine_record` | — |
| Dose pendente / atrasada | `data_proxima_dose` no futuro / no passado; vale só o registro mais recente de cada vacina | `src/services/vaccine-progress.service.ts` |
| Badge de Próximas Doses | dias até a próxima dose: atrasada < 0, em breve 0–7, próxima 8–30, agendada > 30 | idem |
| Progresso da Home (%) | doses registradas (limitadas ao esquema) ÷ soma de `doses_necessarias` do catálogo | idem |
| Disparo do lembrete | (`data_proxima_dose` − `antecedencia_dias`) às `horario`, fuso de São Paulo | `src/services/reminder.service.ts` |
| Status do lembrete | desativado, sem data, agendado, pendente (disparo passou e não foi visto) ou lido (`lido_para` = disparo atual) | idem |
| Campanha em destaque | `destaque = true` e hoje entre início e fim; as que terminam antes vêm primeiro | `src/services/campaign.service.ts` |
| Distância da clínica | fórmula de Haversine, com pré-filtro por retângulo no índice de latitude/longitude | `src/services/clinic.service.ts`, `src/lib/geo.ts` |

Como o disparo é calculado, editar a data da próxima dose de um registro reagenda o lembrete sozinho, sem atualizar a tabela `reminder`.

---

## 5. Migrations

| Data | Migration | Entrega | O que faz |
|---|---|---|---|
| 31/08/2026 | `20260831223822_init_eimune_v2` | S0 / AC1 | cria as 9 tabelas, índices e chaves estrangeiras |
| 12/10/2026 | `20261012120000_add_vaccine_record_observacoes` | AC2 | `vaccine_record.observacoes` |
| 12/10/2026 | `20261012130000_add_vaccine_record_atualizado_em` | AC2 | `vaccine_record.atualizado_em` (preenche as linhas existentes) |
| 04/11/2026 | `20261104120000_ac3_lembretes_campanhas_preferencias` | AC3 | lembrete por registro (`ativo`, `antecedencia_dias`, `horario`, `lido_para`, `vaccine_record_id` único com CASCADE), `campaign.publico_alvo` e novo padrão de `notification_preferences` |

A migration da AC3 apaga os lembretes no formato antigo antes de mudar a tabela: eles não tinham como ser convertidos e nenhuma tela os usava.

---

## 6. Dados de teste (seed)

O seed (`prisma/seed.ts`) apaga os dados e recria tudo com IDs fixos. As datas são relativas ao dia em que ele roda, então os cenários não envelhecem.

| Dado | Qtde | Detalhe |
|---|---|---|
| Usuários | 2 | `admin@eimune.test` / `Admin123!` (ADMIN) e `user@eimune.test` / `User123!` |
| Vacinas | 6 | COVID-19, Influenza, Hepatite B, Tríplice Viral, Febre Amarela, HPV |
| Campanhas | 3 | 2 em destaque (Influenza e Multivacinação), todas vigentes e com público-alvo |
| Clínicas | 5 | São Paulo capital, com latitude e longitude reais |
| Registros | 7 | do `user@eimune.test`, 64% de progresso |
| Lembretes | 3 | do `user@eimune.test` |

Cenário de doses (telas Home, Histórico e Próximas Doses):

| Vacina | Doses registradas | Próxima dose | Status |
|---|---|---|---|
| Influenza | 1 de 1 | — | completa |
| Febre Amarela | 1 de 1 | — | completa |
| Hepatite B | 2 de 3 | venceu há 20 dias | atrasada |
| Tríplice Viral | 1 de 2 | em 5 dias | em breve |
| COVID-19 | 1 de 2 | em 18 dias | próxima |
| HPV | 1 de 2 | em 120 dias | agendada |

Cenário de lembretes (tela Lembrete e sino da Home):

| Registro | Configuração | Status |
|---|---|---|
| Hepatite B, dose 2 | ativo, 1 dia antes às 09:00 | pendente |
| COVID-19, dose 1 | ativo, 3 dias antes às 08:30 | agendado |
| Tríplice Viral, dose 1 | desligado | desativado |

---

## 7. Como subir o banco

Requisitos: Node 20+ e Docker.

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:setup
```

O `.env` precisa de:

```env
DATABASE_URL="postgresql://eimune:eimune123@localhost:6032/eimune_db?schema=public"
```

| Comando | O que faz |
|---|---|
| `npm run db:setup` | gera o client, aplica as migrations e roda o seed |
| `npm run db:generate` | gera o Prisma Client em `src/generated/prisma` |
| `npm run db:migrate` | cria uma migration nova a partir do schema (desenvolvimento) |
| `npm run db:deploy` | aplica as migrations existentes |
| `npm run db:seed` | recria os dados de teste |
| `npm run db:studio` | abre o Prisma Studio para ver as tabelas |
| `npm test` | testes de API e de regras (precisa do banco no ar; cria e apaga os próprios dados) |

No código, o banco é acessado só por `import { prisma } from "../lib/prisma"`; nenhum outro arquivo cria `PrismaClient`.

---

## 8. Entregas do banco por AC

| AC | O que foi entregue |
|---|---|
| S0 / AC1 | Schema completo (9 tabelas), migration inicial, seed com usuários, vacinas, campanhas, clínicas e registros, diagrama ER e documentação |
| AC2 | `observacoes` e `atualizado_em` em `vaccine_record`, duas migrations, seed com todos os status de dose e datas no fuso de São Paulo |
| AC3 | Lembrete por registro, público-alvo nas campanhas, preferências de notificação por toggle, migration, seed com lembretes e campanhas em destaque |

---

## 9. Fora do banco, de propósito

| Pedido das telas | Como é resolvido |
|---|---|
| Confirmar senha | só no front |
| Foto de perfil | fora do escopo; o perfil mostra as iniciais |
| Distância da clínica | calculada |
| Status aplicada / pendente / atrasada | calculado |
| Momento do disparo do lembrete | calculado |
| Envio de push, e-mail ou WhatsApp | fora do escopo; o app mostra os lembretes pendentes |
