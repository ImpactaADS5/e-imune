# e-Immune — Front-end (HTML/CSS/JS)

Front-end estático, **mobile-first**, responsivo (mobile → tablet → desktop),
seguindo exatamente o layout, cores e estrutura das telas de referência.
Pronto para consumir uma API REST em **Node.js + Prisma**.

## 🧪 Modo de demonstração (sem back-end)

Por padrão, `assets/js/config.js` está com `MOCK_MODE: true`. Nesse modo:

- **Nenhuma chamada de rede é feita** — tudo funciona só no navegador.
- Os dados (catálogo de vacinas e registros) ficam salvos no `localStorage`,
  simulando um banco de dados. Já vem com 3 vacinas e 2 registros de exemplo.
- **Login de teste:** e-mail `admin` (ou `admin@eimmune.com`) e senha `admin`.
- Cadastro (`register.html`) sempre "funciona" (não bate em servidor
  nenhum). Para testar a regra de e-mail duplicado (RN03), use o e-mail
  `existente@teste.com` — ele sempre retorna erro 409 de propósito.
- Para recomeçar do zero (limpar vacinas/registros de teste), abra o
  console do navegador na página e rode:
  ```js
  localStorage.clear(); location.reload();
  ```

### Quando o back-end (Node + Prisma) estiver pronto

Abra `assets/js/config.js` e troque uma linha:

```js
window.API_CONFIG = {
  MOCK_MODE: false,          // <- desliga o modo de demonstração
  BASE_URL: "http://localhost:3333/api", // aponte para a API real
  ...
};
```

Nenhuma outra página ou arquivo `.js` precisa mudar — `api.js` já faz
requisições reais (`fetch`) para `BASE_URL` quando `MOCK_MODE` é `false`,
usando o mesmo contrato de rotas descrito mais abaixo.

## Novidades desta sprint

- **Próximas Doses** (`pages/next-doses.html`): lista com badges (Atrasada / Esta semana / Em breve / Agendada) e dias restantes.
  A aba **Vacinas** da barra inferior agora aponta para essa tela (`vaccine-list.html` continua existindo, acessível pela URL).
- **Editar registro**: `vaccine-record-form.html?id=<id>` (botão de lápis no Histórico) — `GET` + `PUT /vaccine-records/:id`.
- **Próxima dose (opcional)** no formulário de registro.
- **Home** consome `GET /vaccine-records/summary` (percentual, mensagem, próxima dose, doses atrasadas no sino).
- Contrato completo e decisões de regra: `docs/INTEGRACAO.md`.
- O seed do mock é versionado; se aparecer dado antigo, rode `localStorage.clear(); location.reload();`.

## Substituir a logo
Troque `assets/img/logo.svg` pelo arquivo oficial (mesmo nome, ou ajuste os
`<img src="...">` nas páginas). Enquanto não existir, um ícone de escudo
inline é usado via `background` (gradiente) do `.brand-shield`.

## Estrutura de pastas

```
e-immune-web/
├── pages/
│   ├── index.html                 # Tela 1 — Splash
│   ├── login.html                 # Tela 2 — Login
│   ├── register.html              # Tela 3 — Cadastro de Usuário
│   ├── home.html                  # Tela 4 — Home
│   ├── vaccine-record-form.html   # Tela 5 — Registrar Nova Vacina (CREATE VaccineRecord)
│   ├── vaccine-record-list.html   # Histórico de Vacinas (LIST VaccineRecord)
│   ├── vaccine-form.html          # Cadastrar Vacina (CREATE Vaccine)
│   └── vaccine-list.html          # Vacinas Cadastradas (LIST Vaccine)
├── assets/
│   ├── css/
│   │   ├── variables.css   # Design tokens (cores, raios, sombras, fontes)
│   │   ├── reset.css
│   │   ├── base.css        # .app-shell, .screen, utilitários
│   │   ├── components.css  # botões, inputs, cards, bottom-nav, toast...
│   │   ├── responsive.css  # breakpoints tablet (768px) e desktop (1024px)
│   │   ├── splash.css / auth.css / home.css / form.css / list.css
│   ├── js/
│   │   ├── config.js       # BASE_URL e endpoints da API
│   │   ├── api.js          # wrapper fetch (auth Bearer, erros padronizados)
│   │   ├── utils.js        # validações, toast, formatação de datas
│   │   ├── splash.js / login.js / register.js / home.js
│   │   ├── vaccine-record.js  # CREATE + LIST de VaccineRecord
│   │   └── vaccine.js         # CREATE + LIST de Vaccine (catálogo)
│   └── img/
│       └── logo.svg
```

## Como ajustar para o seu back-end

Em `assets/js/config.js`, altere apenas `BASE_URL`:

```js
window.API_CONFIG = {
  BASE_URL: "http://localhost:3333/api", // <- endpoint do seu Node/Prisma
  ...
};
```

## Contrato de API esperado (Node + Prisma)

O front assume as rotas abaixo. Ajuste nomes em `config.js` caso seu backend
use outra convenção.

| Método | Rota                     | Uso                                   |
|--------|--------------------------|----------------------------------------|
| POST   | /auth/register           | Cadastro (RN01–RN08 da Tela 3)         |
| POST   | /auth/login              | Login → `{ token, user }`              |
| GET    | /users/me                | Perfil do usuário logado               |
| GET    | /vaccines                | Lista catálogo de vacinas              |
| POST   | /vaccines                | Cria vacina no catálogo                |
| DELETE | /vaccines/:id            | Remove vacina do catálogo (bônus)      |
| GET    | /vaccine-records         | Lista registros do usuário logado      |
| POST   | /vaccine-records         | Cria registro (Tela 5, RN01–RN06)      |
| DELETE | /vaccine-records/:id     | Remove um registro (bônus)             |

### Sugestão de schema Prisma

```prisma
model User {
  id             String          @id @default(uuid())
  nome           String
  email          String          @unique
  dataNascimento DateTime
  senha          String
  createdAt      DateTime        @default(now())
  records        VaccineRecord[]
}

model Vaccine {
  id                String          @id @default(uuid())
  nome              String
  fabricante        String?
  dosesRecomendadas Int?
  records           VaccineRecord[]
}

model VaccineRecord {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  vaccineId      String
  vaccine        Vaccine  @relation(fields: [vaccineId], references: [id])
  dose           String?
  dataAplicacao  DateTime
  local          String?
  lote           String?
  observacoes    String?
  createdAt      DateTime @default(now())
}
```

O front espera que `GET /vaccine-records` já retorne `vaccineNome` (nome da
vacina relacionada) junto de cada registro — inclua isso no `select`/`include`
do Prisma, ou ajuste `home.js` / `vaccine-record.js` para o formato que preferir.

## Regras de negócio já implementadas no front

- **Tela 3 (Cadastro):** RN01–RN08 — nome obrigatório, e-mail válido,
  e-mail duplicado tratado via HTTP 409, data de nascimento não pode ser
  futura, senha mínima de 6 caracteres, confirmação idêntica.
- **Tela 5 (Registrar Vacina):** RN01–RN06 — nome da vacina e data
  obrigatórios, **data não pode ser futura** (`max` no `<input type="date">`
  + validação em JS), campo obrigatório vazio bloqueia o envio com mensagem.

## Responsividade

- **Mobile (padrão):** layout idêntico às imagens de referência, navegação
  inferior fixa.
- **Tablet (≥768px):** mesma estrutura, cartão central mais largo,
  formulários com campos em 2 colunas onde fizer sentido.
- **Desktop (≥1024px):** mesmas cores/estrutura; a navegação inferior
  transforma-se em um trilho lateral fixo (mesmo conjunto de ícones/labels),
  telas de autenticação ficam centralizadas em um cartão único.

## Observações

- Sem dependências de build — abra os arquivos direto no navegador ou sirva
  com qualquer HTTP server estático (ex.: `npx serve pages`).
- O token de sessão é salvo em `localStorage` (`eimmune_token` /
  `eimmune_user`); ajuste `api.js` caso prefira cookies httpOnly.
- Ícones são SVGs inline (sem dependência externa); fontes via Google Fonts
  (Poppins/Inter) — troque por versão self-hosted se precisar de app 100%
  offline.
