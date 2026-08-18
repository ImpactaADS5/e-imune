-- CreateTable
CREATE TABLE "paciente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "data_nascimento" TIMESTAMP(3) NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacina" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "fabricante" TEXT,
    "doses_necessarias" INTEGER NOT NULL,
    "intervalo_dias" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vacina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicacao" (
    "id" SERIAL NOT NULL,
    "numero_dose" INTEGER NOT NULL,
    "data_aplicacao" TIMESTAMP(3) NOT NULL,
    "data_proxima_dose" TIMESTAMP(3),
    "lote" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paciente_id" INTEGER NOT NULL,
    "vacina_id" INTEGER NOT NULL,

    CONSTRAINT "aplicacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paciente_cpf_key" ON "paciente"("cpf");

-- AddForeignKey
ALTER TABLE "aplicacao" ADD CONSTRAINT "aplicacao_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicacao" ADD CONSTRAINT "aplicacao_vacina_id_fkey" FOREIGN KEY ("vacina_id") REFERENCES "vacina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
