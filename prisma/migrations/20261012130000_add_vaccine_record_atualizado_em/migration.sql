-- AlterTable
-- DEFAULT só para preencher as linhas que já existem; o Prisma (@updatedAt) cuida do valor depois.
ALTER TABLE "vaccine_record" ADD COLUMN "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vaccine_record" ALTER COLUMN "atualizado_em" DROP DEFAULT;
