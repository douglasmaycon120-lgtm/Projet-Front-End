# Nexo CRM

CRM responsivo para gestão de clientes, pedidos e histórico de atendimento. Desenvolvido com Vite, React e TypeScript.

## Repositório

**Link do GitHub:** [https://github.com/SEU-USUARIO/nexo-crm](https://github.com/SEU-USUARIO/nexo-crm) — substitua pelo endereço real do repositório criado para esta entrega.

## Requisitos

- Node.js e npm
- O servidor da disciplina (`servidor-crm`) iniciado em `http://localhost:3333`

## Como executar

1. Na pasta raiz deste projeto, instale as dependências: `npm install`.
2. Confira o arquivo `.env` e configure `VITE_API_URL=http://localhost:3333`.
3. Inicie o servidor local da disciplina em outro terminal.
4. Execute `npm run dev` e abra a URL indicada pelo Vite.

Para alterar `.env`, reinicie o servidor de desenvolvimento. Login de teste: `emilys` / `emilyspass`.

## Build de produção

Execute `npm run build`. Os arquivos compilados serão gerados em `dist/`.

## Funcionalidades

- Login com token, sessão persistida e retorno à rota solicitada após autenticação.
- Painel com resumo de vendas, pedidos por status e clientes em destaque.
- Busca e paginação de clientes, perfil, edição e exclusão com contagem de registros associados.
- Pedidos com cálculo de total, edição dos itens e transições de status permitidas.
- Histórico de atendimentos com filtros, edição e exclusão.
- Tratamento de erros da API, indicadores de carregamento e layout adaptável a celular.

## Entrega

Gere o ZIP a partir desta pasta, excluindo `node_modules/` e `dist/`. Antes de enviar, substitua o texto do link do GitHub acima pela URL do repositório.
