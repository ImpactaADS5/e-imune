
## 1. Instalar e preparar

Não há dependência nova. Se ainda não rodou, `npm install` basta.

```bash
git checkout -b feature/ph-lembretes-campanhas-clinicas
```

Copie os arquivos para as pastas indicadas na seção 1. Crie as pastas que faltarem (todas já existem desde a sprint passada).

## 2. Banco (Prisma)

Abra o seu `prisma/schema.prisma` e faça duas coisas. Não substitua o arquivo.

Primeiro, acrescente a linha `reminders Reminder[]` dentro do model `User` e dentro do model `VaccineRecord`.

Depois, cole estes três models no fim do arquivo:

```prisma
model Reminder {
  id               String        @id @default(uuid())
  userId           String
  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  vaccineRecordId  String        @unique
  vaccineRecord    VaccineRecord @relation(fields: [vaccineRecordId], references: [id], onDelete: Cascade)
  ativo            Boolean       @default(true)
  antecedenciaDias Int           @default(1)
  horario          String        @default("09:00")
  ackedFor         String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([userId])
}

model Campaign {
  id          String   @id @default(uuid())
  titulo      String
  descricao   String
  publicoAlvo String?
  inicio      DateTime
  fim         DateTime
  destaque    Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([destaque, fim])
}

model Clinic {
  id        String  @id @default(uuid())
  nome      String
  endereco  String
  cidade    String
  uf        String
  telefone  String?
  latitude  Float
  longitude Float

  @@index([latitude, longitude])
}
```

Se os ids do seu schema forem `Int` e não `String`/uuid, troque `userId` e `vaccineRecordId` para `Int` no model `Reminder`.

Depois rode:

```bash
npx prisma migrate dev --name add-reminders-campaigns-clinics
npx prisma generate
```

Para ter campanhas e clínicas para testar, rode o seed de exemplo. Os nomes e telefones são inventados e as clínicas ficam em volta de Taboão da Serra.

```bash
npx tsx prisma/seed-ph.ts
```

## 3. Testes automáticos

```bash
npx tsc --noEmit
npx tsx --test tests/*.test.ts
```

O esperado é nenhum erro no `tsc` e `# pass 42`, `# fail 0`.

## 4. Testar a API

Suba o servidor com `npm run dev`. Faça login pelo endpoint do time de back e guarde o token:

```bash
TOKEN="cole-o-token-aqui"
```

O token precisa ter o id do usuário em `sub` e ser assinado com o mesmo `JWT_SECRET` do `.env`.

Campanhas em destaque:

```bash
curl -s localhost:3000/api/campaigns/featured -H "Authorization: Bearer $TOKEN"
```

Clínicas próximas (coordenadas de exemplo, raio padrão de 10 km):

```bash
curl -s "localhost:3000/api/clinics/nearby?lat=-23.6086&lng=-46.7917" -H "Authorization: Bearer $TOKEN"
```

Lembretes. Use o id de um registro seu que tenha `proximaDose`:

```bash
curl -s -X POST localhost:3000/api/reminders -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vaccineRecordId":"ID_DO_REGISTRO","antecedenciaDias":3,"horario":"08:30"}'

curl -s localhost:3000/api/reminders -H "Authorization: Bearer $TOKEN"
curl -s localhost:3000/api/reminders/due -H "Authorization: Bearer $TOKEN"

curl -s -X PUT localhost:3000/api/reminders/ID_DO_LEMBRETE -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"ativo":false}'
```

Excluir um registro. O lembrete ligado a ele sai junto, e a resposta diz quantos foram removidos:

```bash
curl -s -X DELETE localhost:3000/api/vaccine-records/ID_DO_REGISTRO -H "Authorization: Bearer $TOKEN"
# {"deleted":true,"removedReminders":1}
```

## 5. Testar o front sem back

Deixe `MOCK_MODE: true` em `config.js`, abra `http://localhost:3000`, entre com `admin` / `admin` e abra o console do navegador (F12). Como as telas de Lembrete e Campanhas são do Endrew, dá para testar a conexão direto pelo console:

```js
await Api.get("/reminders")
await Api.get("/reminders/due")
await Api.put("/reminders/m1", { ativo: false })
await Api.get("/campaigns/featured")
const p = await Utils.getPosition()
await Api.get(`/clinics/nearby?lat=${p.lat}&lng=${p.lng}`)
await Api.del("/vaccine-records/r1")   // apaga o registro e o lembrete m1
```

Ao trocar o seed do mock para a versão v3, os dados de teste do navegador são recriados uma vez. Isso só afeta o localStorage.

A localização do navegador só funciona em `localhost` ou HTTPS.

Para falar com o back de verdade, troque para `MOCK_MODE: false`.

## 6. Contrato para o Endrew

Todas as rotas exigem `Authorization: Bearer <token>`. Erros de validação voltam como `400 { message, errors: { campo: "mensagem" } }`.

| Tela dele | Chamada | Resposta |
|---|---|---|
| Lembrete: listar | `GET /api/reminders` | lista com `id, vaccineRecordId, vaccineNome, doseLabel, dataPrevista, ativo, antecedenciaDias, horario, disparoEm, status` |
| Lembrete: toggle | `PUT /api/reminders/:id` com `{ ativo }` | o lembrete atualizado |
| Lembrete: antecedência e horário | `PUT /api/reminders/:id` com `{ antecedenciaDias, horario }` | o lembrete atualizado |
| Lembrete: criar | `POST /api/reminders` com `{ vaccineRecordId, antecedenciaDias?, horario? }` | 201 com o lembrete |
| Sino ou aviso | `GET /api/reminders/due` | só os `PENDENTE` |
| Marcar como visto | `POST /api/reminders/:id/ack` | o lembrete com `status: "LIDO"` |
| Home: campanhas | `GET /api/campaigns/featured?limit=5` | lista com `titulo, descricao, publicoAlvo, inicio, fim, diasRestantes` |
| Histórico: excluir | `DELETE /api/vaccine-records/:id` | `{ deleted: true, removedReminders: n }` |

Valores de `status`: `AGENDADO`, `PENDENTE`, `LIDO`, `DESATIVADO`, `SEM_DATA`. Antecedência aceita 0 a 30 dias, horário no formato `HH:mm`.

## 7. Regras que valem saber

- Existe um lembrete por registro, e o registro precisa ter `proximaDose`. Sem isso o `POST` devolve 400.
- O momento do disparo não fica gravado. É calculado como `proximaDose − antecedência`, no horário de São Paulo. Se o usuário editar a próxima dose do registro, o lembrete reagenda sozinho.
- O "agendamento" calcula e expõe o que já deveria ter avisado (`/due`) para o app mostrar dentro dele. Não há envio de push, e-mail ou WhatsApp. Isso pediria um job e um canal de envio, e não estava no escopo.
- Excluir registro apaga os lembretes numa transação. O `onDelete: Cascade` no schema é a segunda proteção contra erro de FK.
- Clínicas: a distância é calculada com Haversine, com pré-filtro por retângulo no banco. Raio padrão de 10 km (máximo 100) e limite padrão de 10 (máximo 50).
- Campanhas: aparece quem tem `destaque = true` e cobre o dia de hoje. As que terminam antes vêm primeiro. Não há tela nem rota para cadastrar campanhas e clínicas, só o seed de exemplo.

## 8. Commits sugeridos (nesta ordem)

1. `feat(db): adiciona Reminder, Campaign e Clinic ao schema` (schema.prisma, migration, schema.reference.prisma, seed-ph.ts)
2. `feat(api): exclusão de registro de vacina tratando FK dos lembretes` (os quatro arquivos de vaccine-record em repositories, controllers e routes)
3. `feat(api): CRUD de lembretes com cálculo de agendamento` (dates.ts, reminder.*)
4. `feat(api): campanhas em destaque` (campaign.*)
5. `feat(api): clínicas próximas por geolocalização` (geo.ts, clinic.*)
6. `feat(api): registra rotas de lembretes, campanhas e clínicas` (app.ts)
7. `test(api): testes de exclusão, lembretes, campanhas e clínicas` (helpers.ts, ph.test.ts)
8. `feat(front): endpoints, mock e geolocalização para a sprint do PH` (config.js, utils.js, api.js)
9. `docs: passo a passo da integração ` (INTEGRACAO.md)

## 9. O que foi e o que não foi verificado

Verificado: 42 testes passando (19 da sprint anterior e 23 novos), `tsc` sem erros e um teste no navegador com o mock (lembretes, exclusão com FK, campanhas, clínicas e geolocalização, além de Home, Próximas Doses e Histórico carregando sem erro).

Não verificado: os arquivos `prisma-*.repo.ts` e o `seed-ph.ts` não foram executados contra um banco real, porque o Prisma não baixa os binários neste ambiente. Eles foram só revisados. A lógica fica atrás de repositórios e foi testada com repositórios em memória. A primeira execução real é a do passo 4.
