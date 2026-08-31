# e-imune

Carteira de vacinação digital: cadastro, histórico, lembretes, campanhas e clínicas próximas.

Stack: Node 20, Express, TypeScript, Prisma 7, PostgreSQL 16.

## Iniciar o projeto

Requisitos: Node 20+, Docker.

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:setup
npm run dev
```

`npm ci` instala as dependências travadas no `package-lock.json`. Use isso no clone; não use `npm install` no dia a dia do time.

O Prisma Client é gerado em `src/generated/prisma` (não vai no git). Por isso o `db:setup` roda `prisma generate` depois do `npm ci`.

Servidor: `http://localhost:3000`  
Postgres: `localhost:6032` → banco `eimune_db`

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

No código, o banco entra só por `src/lib/prisma.ts`:

```ts
import { prisma } from "../lib/prisma";
```
