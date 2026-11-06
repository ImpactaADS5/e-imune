# e-imune

Carteira de vacinação digital: cadastro, histórico, lembretes, campanhas e clínicas próximas.

Stack: Node 20, Express, TypeScript, Prisma 7, PostgreSQL 16.

## Iniciar o projeto

Requisitos: Git, Node 20+ e Docker. No Windows, use o Docker Desktop **aberto** e, se rodar o projeto no WSL, ative a distro em *Settings → Resources → WSL Integration*.

```bash
git clone https://github.com/ImpactaADS5/e-imune.git
cd e-imune
npm ci
cp .env.example .env        # no cmd do Windows: copy .env.example .env
docker compose up -d
docker ps                   # eimune-postgres precisa estar "Up", porta 6032
npm run db:setup
npm run dev
```

Deu certo quando o `db:setup` mostra `All migrations have been successfully applied` e `Seed ok`.

O aviso `Update available 7.x -> 8.x` do Prisma pode ser ignorado. Não atualize: o projeto usa Prisma 7.

### Problemas comuns

| Erro | Causa | Como resolver |
|---|---|---|
| `P3005 The database schema is not empty` | o volume do Postgres tem tabelas de uma versão antiga do projeto, sem histórico de migrations | `docker compose down -v`, `docker compose up -d` e `npm run db:setup` de novo (apaga o banco local) |
| `P1001 Can't reach database server at localhost:6032` | o container não está de pé ou ainda está subindo | `docker compose up -d`, confira com `docker ps`, espere alguns segundos e rode o `db:setup` de novo |
| `P1001` com o container `Up` | `localhost` não resolve para o Docker (comum no WSL) | troque `localhost` por `127.0.0.1` no `DATABASE_URL` do `.env` |
| `port is already allocated` ao subir o compose | outro programa já usa a porta 6032 | mude a porta em `docker-compose.yml` e no `DATABASE_URL` |
| `Cannot find module ...` no `npm run dev` | dependências desatualizadas depois de um `git pull` | `npm ci` e `npm run db:setup` |

`JWT_SECRET` é obrigatório e deve ser substituído por um valor aleatório com pelo menos 32 caracteres antes de publicar o sistema.

Para depurar localmente, use `LOG_LEVEL=DEBUG`. Em produção, `LOG_FORMAT=json` facilita a coleta por ferramentas de observabilidade. Os logs incluem `requestId`, duração, payloads sanitizados e o resultado das operações; senhas, tokens e segredos são ocultados.

`npm ci` instala as dependências travadas no `package-lock.json`. Use isso no clone; não use `npm install` no dia a dia do time.

O Prisma Client é gerado em `src/generated/prisma` (não vai no git). Por isso o `db:setup` roda `prisma generate` depois do `npm ci`.

Servidor: `http://localhost:3000`

Postgres (definido no `docker-compose.yml`, só para desenvolvimento):

| Host | Porta | Banco | Usuário | Senha |
|---|---|---|---|---|
| `localhost` | `6032` | `eimune_db` | `eimune` | `eimune123` |

Para conectar por DBeaver, pgAdmin ou `psql`, use esses dados. Pelo terminal: `docker exec -it eimune-postgres psql -U eimune -d eimune_db`.

## Banco de dados

Documentação completa: [docs/banco-de-dados.md](docs/banco-de-dados.md)  
Diagrama: [prisma/ERD.md](prisma/ERD.md)

```bash
npm run db:studio
```

Contas do seed:

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | `admin@eimune.test` | `Admin123!` |
| User | `user@eimune.test` | `User123!` |

## Scripts

| Comando | Uso |
|---|---|
| `npm ci` | Instala deps do lockfile |
| `npm run dev` | API em watch |
| `npm run build` | Compila TypeScript |
| `npm run db:setup` | generate + migrate + seed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Testes (precisa do banco no ar) |

No código, o banco entra só por `src/lib/prisma.ts`:

```ts
import { prisma } from "../lib/prisma";
```
