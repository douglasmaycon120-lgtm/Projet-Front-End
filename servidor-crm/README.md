# Servidor do CRM · Lab Front 2026.2 · P2

Servidor local pronto para a prova. Ele **grava de verdade** nos arquivos da pasta `data/` (sem banco de dados) e tem login com token. Você **não precisa mexer** nele: o seu trabalho é o app (front).

## Como rodar

```bash
cd servidor-crm
npm install
npm start
```

O servidor sobe em `http://localhost:3333`. Deixe esse terminal aberto e use outro para o seu app.

No `.env` do seu projeto (Vite):

```
VITE_API_URL=http://localhost:3333
```

## Conta de teste

Usuário `emilys` · senha `emilyspass`. O login devolve `accessToken`; todas as outras rotas exigem o header `Authorization: Bearer <accessToken>`. O token some quando o servidor reinicia (aí as rotas respondem 401).

## Voltar os dados ao início

Estragou os dados? Pare o servidor e rode `npm run reset`.

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| POST | `/auth/login` | `{ "username", "password" }` → `accessToken` |
| GET | `/auth/me` | usuário logado |
| GET | `/clientes?q=&limit=&skip=` | lista (`clientes`, `total`, `skip`, `limit`); `q` busca por nome ou e-mail |
| GET | `/clientes/:id` | detalhe |
| POST | `/clientes` | criar · `nome` e `email` obrigatórios; opcionais `telefone`, `empresa`, `cidade` |
| PATCH | `/clientes/:id` | editar (envie só os campos que mudam) |
| DELETE | `/clientes/:id` | excluir (leva junto os pedidos e o histórico do cliente) |
| GET | `/pedidos` | todos os pedidos (`pedidos`, `total`) |
| GET | `/clientes/:id/pedidos` | pedidos do cliente |
| POST | `/clientes/:id/pedidos` | criar · `{ "itens": [{ "titulo", "preco", "quantidade" }] }`; opcionais `data` e `status` |
| PATCH | `/pedidos/:id` | editar `itens`, `status` (`aberto`, `pago`, `cancelado`) ou `data` |
| DELETE | `/pedidos/:id` | excluir |
| GET | `/clientes/:id/atendimentos` | histórico do cliente (mais recente primeiro) |
| POST | `/clientes/:id/atendimentos` | criar · `titulo` e `texto` obrigatórios; `canal` (`telefone`, `email`, `whatsapp`, `presencial`) |
| PATCH | `/atendimentos/:id` | editar |
| DELETE | `/atendimentos/:id` | excluir |
| GET | `/http/404/Mensagem` | devolve o status pedido (treino de erro; sem login) |

## Atenção

- **O total do pedido não vem pronto.** Quem soma é o seu app (`preço × quantidade` de cada item).
- Preço é número com **ponto** (`24.5`), nunca vírgula.
- Erros que o servidor devolve de verdade: **400** dados inválidos (inclusive login errado), **401** sem login ou sessão expirada, **404** não encontrado, **409** e-mail de cliente repetido, **500** erro do servidor (teste com `/http/500/...`). O texto vem em `message`.
- Não coloque a pasta `node_modules` no ZIP da entrega.
