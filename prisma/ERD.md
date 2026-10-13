# ERD — e-imune (S0 + AC2)

Documentação completa: [docs/banco-de-dados.md](../docs/banco-de-dados.md).

Decisão de migração: **RESET + RESEED**. Sem dado de produção. Tabelas legadas `paciente`, `vacina` e `aplicacao` foram substituídas.

`Clinic` não tem FK para `Vaccine`. `Reminder.vaccine_record_id` é opcional.

```mermaid
erDiagram
  User ||--o{ Session : has
  User ||--o{ PasswordResetToken : has
  User ||--o{ VaccineRecord : has
  User ||--o{ Reminder : has
  Vaccine ||--o{ VaccineRecord : has
  VaccineRecord ||--o{ Reminder : has
  Vaccine ||--o{ CampaignVaccines : has
  Campaign ||--o{ CampaignVaccines : has
  VaccineRecord {
    string id
    string user_id
    string vaccine_id
    int numero_dose
    datetime data_aplicacao
    datetime data_proxima_dose
    string lote
    string local
    string observacoes
    string comprovante_url
    datetime criado_em
    datetime atualizado_em
  }
  Clinic {
    string id
    string nome
    float latitude
    float longitude
  }
```

AC2: `VaccineRecord` ganhou `observacoes` e `atualizado_em`.

## Tabelas

| Modelo | Tabela | Dono de consumo |
|---|---|---|
| User | `user` | Aylon |
| Session | `session` | Aylon |
| PasswordResetToken | `password_reset_token` | Aylon |
| Vaccine | `vaccine` | Gustavo |
| VaccineRecord | `vaccine_record` | Gustavo |
| Reminder | `reminder` | Gustavo |
| Campaign | `campaign` | Gustavo |
| CampaignVaccines | `campaign_vaccines` | Gustavo |
| Clinic | `clinic` | Gustavo |
