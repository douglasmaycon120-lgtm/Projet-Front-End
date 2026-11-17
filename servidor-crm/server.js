// Servidor do CRM · Lab Front 2026.2 · P2
// Grava de verdade em arquivos .json (pasta data/), sem banco de dados.
// Rodar: npm install && npm start  →  http://localhost:3333
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PORT = process.env.PORT || 3333
const DATA = path.join(__dirname, 'data')

const ler = (nome) => JSON.parse(fs.readFileSync(path.join(DATA, nome + '.json'), 'utf-8'))

function gravar(nome, dados) {
  const arquivo = path.join(DATA, nome + '.json')
  const tmp = arquivo + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(dados, null, 2))
  fs.renameSync(tmp, arquivo)
}

const proximoId = (lista) => lista.reduce((maior, x) => Math.max(maior, x.id), 0) + 1
const erro = (res, status, message) => res.status(status).json({ message })
const texto = (v) => typeof v === 'string' && v.trim().length > 0
const emailValido = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
const hoje = () => new Date().toISOString().slice(0, 10)

const app = express()
app.use(cors())
app.use(express.json())

// ───────── rota de treino de erro (sem login): GET /http/404/Mensagem ─────────
app.get('/http/:codigo/:mensagem?', (req, res) => {
  const codigo = Number(req.params.codigo)
  if (!Number.isInteger(codigo) || codigo < 200 || codigo > 599) return erro(res, 400, 'Código HTTP inválido')
  res.status(codigo).json({ message: req.params.mensagem || 'Resposta de teste' })
})

// ───────── login ─────────
const sessoes = new Map() // token -> id do usuário (some quando o servidor reinicia)

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {}
  if (!texto(username) || !texto(password)) return erro(res, 400, 'Informe usuário e senha')
  const u = ler('usuarios').find((x) => x.username === username && x.password === password)
  if (!u) return erro(res, 400, 'Usuário ou senha inválidos')
  const accessToken = crypto.randomUUID()
  sessoes.set(accessToken, u.id)
  res.json({ accessToken, id: u.id, username: u.username, nome: u.nome })
})

function autenticar(req, res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  const id = m && sessoes.get(m[1])
  if (!id) return erro(res, 401, 'Sessão inválida ou expirada')
  req.usuario = ler('usuarios').find((x) => x.id === id)
  next()
}

app.use(autenticar) // tudo abaixo exige Authorization: Bearer <accessToken>

app.get('/auth/me', (req, res) => {
  const { id, username, nome } = req.usuario
  res.json({ id, username, nome })
})

// ───────── clientes ─────────
function validarCliente(b, parcial) {
  b = b || {}
  if (!parcial || 'nome' in b) if (!texto(b.nome)) return 'Informe o nome do cliente'
  if (!parcial || 'email' in b) if (!emailValido(b.email)) return 'Informe um e-mail válido'
  return null
}
const CAMPOS_CLIENTE = ['nome', 'email', 'telefone', 'empresa', 'cidade']
const soCampos = (b) => Object.fromEntries(CAMPOS_CLIENTE.filter((k) => k in b).map((k) => [k, b[k]]))
const emailEmUso = (clientes, email, ignorarId) =>
  clientes.some((c) => c.id !== ignorarId && c.email.toLowerCase() === String(email).toLowerCase())

app.get('/clientes', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const limit = Math.max(0, Number(req.query.limit ?? 30)) || 30
  const skip = Math.max(0, Number(req.query.skip ?? 0)) || 0
  const todos = ler('clientes').filter(
    (c) => !q || c.nome.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  )
  res.json({ clientes: todos.slice(skip, skip + limit), total: todos.length, skip, limit })
})

app.get('/clientes/:id', (req, res) => {
  const c = ler('clientes').find((x) => x.id === Number(req.params.id))
  if (!c) return erro(res, 404, 'Cliente não encontrado')
  res.json(c)
})

app.post('/clientes', (req, res) => {
  const msg = validarCliente(req.body, false)
  if (msg) return erro(res, 400, msg)
  const clientes = ler('clientes')
  if (emailEmUso(clientes, req.body.email)) return erro(res, 409, 'Já existe um cliente com esse e-mail')
  const novo = { id: proximoId(clientes), ...soCampos(req.body) }
  clientes.push(novo)
  gravar('clientes', clientes)
  res.status(201).json(novo)
})

app.patch('/clientes/:id', (req, res) => {
  const clientes = ler('clientes')
  const c = clientes.find((x) => x.id === Number(req.params.id))
  if (!c) return erro(res, 404, 'Cliente não encontrado')
  const msg = validarCliente(req.body, true)
  if (msg) return erro(res, 400, msg)
  if ('email' in req.body && emailEmUso(clientes, req.body.email, c.id)) return erro(res, 409, 'Já existe um cliente com esse e-mail')
  Object.assign(c, soCampos(req.body))
  gravar('clientes', clientes)
  res.json(c)
})

app.delete('/clientes/:id', (req, res) => {
  const id = Number(req.params.id)
  const clientes = ler('clientes')
  const c = clientes.find((x) => x.id === id)
  if (!c) return erro(res, 404, 'Cliente não encontrado')
  gravar('clientes', clientes.filter((x) => x.id !== id))
  gravar('pedidos', ler('pedidos').filter((p) => p.clienteId !== id)) // leva os pedidos junto
  gravar('atendimentos', ler('atendimentos').filter((a) => a.clienteId !== id)) // e o histórico
  res.json(c)
})

// ───────── pedidos ─────────
// O total do pedido NÃO é gravado: quem calcula é o front (soma de preco × quantidade).
function validarItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) return 'O pedido precisa ter pelo menos 1 item'
  for (const i of itens) {
    if (!texto(i && i.titulo)) return 'Todo item precisa de título'
    if (typeof i.preco !== 'number' || !(i.preco >= 0)) return 'Preço inválido (use número, com ponto)'
    if (!Number.isInteger(i.quantidade) || i.quantidade < 1) return 'Quantidade inválida (inteiro, mínimo 1)'
  }
  return null
}
const numerarItens = (itens) =>
  itens.map((i, k) => ({ id: k + 1, titulo: i.titulo.trim(), preco: i.preco, quantidade: i.quantidade }))
const STATUS = ['aberto', 'pago', 'cancelado']

app.get('/pedidos', (req, res) => {
  const pedidos = ler('pedidos')
  res.json({ pedidos, total: pedidos.length })
})

app.get('/clientes/:id/pedidos', (req, res) => {
  const id = Number(req.params.id)
  if (!ler('clientes').some((c) => c.id === id)) return erro(res, 404, 'Cliente não encontrado')
  const pedidos = ler('pedidos').filter((p) => p.clienteId === id)
  res.json({ pedidos, total: pedidos.length })
})

app.post('/clientes/:id/pedidos', (req, res) => {
  const id = Number(req.params.id)
  if (!ler('clientes').some((c) => c.id === id)) return erro(res, 404, 'Cliente não encontrado')
  const b = req.body || {}
  const msg = validarItens(b.itens)
  if (msg) return erro(res, 400, msg)
  if (b.status !== undefined && !STATUS.includes(b.status)) return erro(res, 400, 'Status inválido (aberto, pago ou cancelado)')
  const pedidos = ler('pedidos')
  const novo = {
    id: proximoId(pedidos),
    clienteId: id,
    data: texto(b.data) ? b.data : hoje(),
    status: b.status || 'aberto',
    itens: numerarItens(b.itens),
  }
  pedidos.push(novo)
  gravar('pedidos', pedidos)
  res.status(201).json(novo)
})

app.patch('/pedidos/:id', (req, res) => {
  const pedidos = ler('pedidos')
  const p = pedidos.find((x) => x.id === Number(req.params.id))
  if (!p) return erro(res, 404, 'Pedido não encontrado')
  const b = req.body || {}
  if ('itens' in b) {
    const msg = validarItens(b.itens)
    if (msg) return erro(res, 400, msg)
    p.itens = numerarItens(b.itens)
  }
  if ('status' in b) {
    if (!STATUS.includes(b.status)) return erro(res, 400, 'Status inválido (aberto, pago ou cancelado)')
    p.status = b.status
  }
  if ('data' in b) p.data = b.data
  gravar('pedidos', pedidos)
  res.json(p)
})

app.delete('/pedidos/:id', (req, res) => {
  const id = Number(req.params.id)
  const pedidos = ler('pedidos')
  const p = pedidos.find((x) => x.id === id)
  if (!p) return erro(res, 404, 'Pedido não encontrado')
  gravar('pedidos', pedidos.filter((x) => x.id !== id))
  res.json(p)
})

// ───────── histórico de atendimento ─────────
const CANAIS = ['telefone', 'email', 'whatsapp', 'presencial']

function validarAtendimento(b, parcial) {
  b = b || {}
  if (!parcial || 'titulo' in b) if (!texto(b.titulo)) return 'Informe o título do atendimento'
  if (!parcial || 'texto' in b) if (!texto(b.texto)) return 'Escreva o texto do atendimento'
  if ('canal' in b && !CANAIS.includes(b.canal)) return 'Canal inválido (telefone, email, whatsapp ou presencial)'
  return null
}

app.get('/clientes/:id/atendimentos', (req, res) => {
  const id = Number(req.params.id)
  if (!ler('clientes').some((c) => c.id === id)) return erro(res, 404, 'Cliente não encontrado')
  const atendimentos = ler('atendimentos')
    .filter((a) => a.clienteId === id)
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
  res.json({ atendimentos, total: atendimentos.length })
})

app.post('/clientes/:id/atendimentos', (req, res) => {
  const id = Number(req.params.id)
  if (!ler('clientes').some((c) => c.id === id)) return erro(res, 404, 'Cliente não encontrado')
  const msg = validarAtendimento(req.body, false)
  if (msg) return erro(res, 400, msg)
  const lista = ler('atendimentos')
  const b = req.body
  const novo = {
    id: proximoId(lista),
    clienteId: id,
    titulo: b.titulo.trim(),
    texto: b.texto.trim(),
    canal: b.canal || 'telefone',
    data: texto(b.data) ? b.data : hoje(),
  }
  lista.push(novo)
  gravar('atendimentos', lista)
  res.status(201).json(novo)
})

app.patch('/atendimentos/:id', (req, res) => {
  const lista = ler('atendimentos')
  const a = lista.find((x) => x.id === Number(req.params.id))
  if (!a) return erro(res, 404, 'Atendimento não encontrado')
  const msg = validarAtendimento(req.body, true)
  if (msg) return erro(res, 400, msg)
  for (const k of ['titulo', 'texto', 'canal', 'data']) if (k in req.body) a[k] = req.body[k]
  gravar('atendimentos', lista)
  res.json(a)
})

app.delete('/atendimentos/:id', (req, res) => {
  const id = Number(req.params.id)
  const lista = ler('atendimentos')
  const a = lista.find((x) => x.id === id)
  if (!a) return erro(res, 404, 'Atendimento não encontrado')
  gravar('atendimentos', lista.filter((x) => x.id !== id))
  res.json(a)
})

// ───────── erros gerais ─────────
app.use((req, res) => erro(res, 404, 'Rota não encontrada'))
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return erro(res, 400, 'JSON inválido no corpo da requisição')
  console.error(err)
  erro(res, 500, 'Erro interno do servidor')
})

app.listen(PORT, () => console.log(`CRM rodando em http://localhost:${PORT}`))
