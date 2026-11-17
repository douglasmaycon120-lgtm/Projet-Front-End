# Nexo CRM

CRM responsivo para gestão de clientes, pedidos e histórico de atendimento, desenvolvido com Vite, React e TypeScript.

## Repositório no GitHub

https://github.com/douglasmaycon120-lgtm/Projet-Front-End

## Requisitos

- Node.js e npm
- Servidor local fornecido pela professora na pasta `servidor-crm`

## 1. Inicie a API

Em um terminal:

```bash
cd servidor-crm
npm install
npm start
```

A API ficará disponível em `http://localhost:3333`.

Conta de teste:

- Usuário: `emilys`
- Senha: `emilyspass`

## 2. Configure e execute o front-end

A raiz do projeto possui o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3333
```

Em outro terminal:

```bash
npm install
npm run dev
```

Depois de alterar o `.env`, reinicie o Vite.

## Build de produção

```bash
npm run build
```

## Funcionalidades

- Login JWT, proteção de rotas e retorno à página solicitada.
- Painel com clientes, vendas válidas, ticket médio, status, Top 3 e atalhos.
- Lista de clientes com busca por nome/e-mail e paginação de 5 em 5.
- Cadastro, edição, detalhe e exclusão de clientes com confirmação.
- Validação de nome, e-mail e dois dados adicionais.
- Pedidos com total calculado no front-end, criação, edição, status e exclusão.
- Regras de status e edição apenas para pedidos abertos.
- Histórico por canal, contador, criação, edição, exclusão e ordenação por data.
- Filtros e ordenação de todos os pedidos.
- Tratamento de 400, 401, 404, 409 e 500, além de estados de carregamento e vazio.
- Layout responsivo sem rolagem lateral em celular.

## Dados e cálculos

Os cálculos de total de pedido, total comprado, selo VIP/Regular/Sem compras e Top 3 ficam em `src/utils.ts`. Pedidos cancelados não entram nas vendas, no ticket médio ou no Top 3.

## Reset da API

Para restaurar os dados de exemplo:

1. Pare o servidor da API.
2. Execute `npm run reset` dentro de `servidor-crm`.
3. Inicie novamente com `npm start`.

## Entrega

O arquivo `nexo-crm.zip` deve ser enviado pelo AVA sem `node_modules`, `dist` ou `.git`.
