-- AC3: lembrete por registro de vacina, público-alvo das campanhas e novas preferências de notificação.

-- Lembretes no formato antigo (titulo/agendado_para/canal) não têm como ser convertidos
-- para "um por registro com antecedência em dias". Não havia tela nem dado real usando a tabela.
DELETE FROM "reminder";

-- DropForeignKey
ALTER TABLE "reminder" DROP CONSTRAINT "reminder_vaccine_record_id_fkey";

-- DropIndex
DROP INDEX "reminder_user_id_agendado_para_idx";

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "publico_alvo" TEXT;

-- AlterTable
ALTER TABLE "reminder" DROP COLUMN "agendado_para",
DROP COLUMN "antecedencia_horas",
DROP COLUMN "canal",
DROP COLUMN "descricao",
DROP COLUMN "status",
DROP COLUMN "titulo",
ADD COLUMN     "antecedencia_dias" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ativo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "horario" VARCHAR(5) NOT NULL DEFAULT '09:00',
ADD COLUMN     "lido_para" TEXT,
ALTER COLUMN "vaccine_record_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "notification_preferences" SET DEFAULT '{"alertas": true, "proximasDoses": true, "campanhas": true, "dicas": false, "resumoSemanal": false}';

-- As preferências antigas ({push, email, whatsapp}) nunca foram editáveis pelo app; todos passam para o padrão novo.
UPDATE "user" SET "notification_preferences" = '{"alertas": true, "proximasDoses": true, "campanhas": true, "dicas": false, "resumoSemanal": false}';

-- CreateIndex
CREATE UNIQUE INDEX "reminder_vaccine_record_id_key" ON "reminder"("vaccine_record_id");

-- CreateIndex
CREATE INDEX "reminder_user_id_idx" ON "reminder"("user_id");

-- AddForeignKey
ALTER TABLE "reminder" ADD CONSTRAINT "reminder_vaccine_record_id_fkey" FOREIGN KEY ("vaccine_record_id") REFERENCES "vaccine_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
