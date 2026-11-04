# Integração da AC3 — lembretes, campanhas, clínicas e exclusão

Contrato da API para as telas da AC3. Banco em [banco-de-dados.md](banco-de-dados.md).

## Preparar o ambiente

```bash
git pull
npm ci
npm run db:setup
npm run dev
```

O `db:setup` aplica a migration `20261104120000_ac3_lembretes_campanhas_preferencias` e recria os dados locais. Login de teste: `user@eimune.test` / `User123!`.

No front, `MOCK_MODE` fica `false` em `public/assets/js/config.js`. Com `true` o app não chama a API.

```bash
npm test
```

## Rotas

Todas exigem `Authorization: Bearer <token>`. Erros de validação voltam como `400 { error, errors: { campo: "mensagem" } }`.

| Tela | Chamada | Resposta |
|---|---|---|
| Lembrete: listar | `GET /api/reminders` | lista com `id, vaccineRecordId, vaccineNome, doseLabel, dataPrevista, ativo, antecedenciaDias, horario, disparoEm, status` |
| Lembrete: um só | `GET /api/reminders/:id` | o lembrete |
| Lembrete: criar | `POST /api/reminders` com `{ vaccineRecordId, ativo?, antecedenciaDias?, horario? }` | 201 com o lembrete |
| Lembrete: toggle | `PUT /api/reminders/:id` com `{ ativo }` | o lembrete atualizado |
| Lembrete: antecedência e horário | `PUT /api/reminders/:id` com `{ antecedenciaDias, horario }` | o lembrete atualizado |
| Lembrete: excluir | `DELETE /api/reminders/:id` | 204 |
| Sino da Home | `GET /api/reminders/due` | só os `PENDENTE`, mais antigos primeiro |
| Marcar aviso como visto | `POST /api/reminders/:id/ack` | o lembrete com `status: "LIDO"` |
| Home: campanhas | `GET /api/campaigns/featured?limit=5` | lista com `id, titulo, descricao, publicoAlvo, inicio, fim, destaque, imagemUrl, diasRestantes` |
| Clínicas próximas | `GET /api/clinics/nearby?lat=&lng=&raio=&limit=` | lista com `id, nome, endereco, cidade, uf, cep, telefone, horario, latitude, longitude, distanciaKm` |
| Histórico: excluir | `DELETE /api/vaccine-records/:id` | `{ deleted: true, removedReminders: 0 ou 1 }` |

Valores de `status` do lembrete: `AGENDADO`, `PENDENTE`, `LIDO`, `DESATIVADO`, `SEM_DATA`.

## Regras

- Um lembrete por registro, e o registro precisa ter próxima dose. Sem data o `POST` devolve 400; se já existe lembrete, 409.
- Antecedência de 0 a 30 dias. Horário no formato `HH:mm`, no fuso de São Paulo.
- O disparo não é gravado: é `próxima dose − antecedência` às `horario`. Editar a próxima dose do registro reagenda sozinho, e um aviso já lido volta a aparecer se o disparo mudar.
- Não há envio de push, e-mail ou WhatsApp. O app mostra o que já deveria ter avisado (`/reminders/due`).
- Excluir um registro apaga o lembrete dele na mesma operação (`ON DELETE CASCADE`).
- Campanhas em destaque: `destaque = true` e hoje entre o início e o fim. As que terminam antes vêm primeiro. Limite padrão 5, máximo 10.
- Clínicas: distância por Haversine com pré-filtro por retângulo no banco. Raio padrão 10 km (máximo 100), limite padrão 10 (máximo 50).

## Código

| Assunto | Rotas e banco | Regra pura (testada sem banco) |
|---|---|---|
| Lembretes | `src/modules/reminder/` | `src/services/reminder.service.ts`, `src/services/reminder.validation.ts` |
| Campanhas | `src/modules/campaign/` | `src/services/campaign.service.ts` |
| Clínicas | `src/modules/clinic/` | `src/services/clinic.service.ts`, `src/lib/geo.ts` |
| Exclusão de registro | `src/modules/vaccine-record/` | — |

Testes em `tests/ac3.test.ts`.
