import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, ArrowDownUp, ArrowLeft, ArrowRight, BadgeCheck, BarChart3, Building2, CalendarDays, Check, ChevronDown, CircleDollarSign, ClipboardList, LayoutDashboard, LoaderCircle, LogOut, Mail, Menu, MessageCircle, Pencil, Phone, Plus, Search, ShoppingBag, Trash2, TrendingUp, UserRound, Users, X } from 'lucide-react'
import { api } from './api'
import { useAuth } from './AuthContext'
import type { Atendimento, Canal, Cliente, ItemPedido, Pedido, StatusPedido } from './types'
import { atendimentoDate, dateLabel, money, pedidoClienteId, pedidoDate, pedidoTotal, seloCliente, topClientes, totalComprado } from './utils'

const channels: Canal[] = ['telefone', 'email', 'whatsapp', 'presencial']
const statuses: StatusPedido[] = ['aberto', 'pago', 'cancelado']
const clientName = (client: Cliente) => client.nome || 'Cliente sem nome'
const userLabel = (user: { username?: string; nome?: string; name?: string; email?: string } | null) => user?.nome || user?.name || user?.username || user?.email || 'Atendente'

function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('Dados do CRM indisponíveis')
  return context
}
type DataValue = { clientes: Cliente[]; pedidos: Pedido[]; totalClientes: number; loading: boolean; error: string; reload: () => Promise<void> }
const DataContext = createContext<DataValue | null>(null)

function DataProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [clientPage, orderResult] = await Promise.all([api.clientes('', 100, 0), api.pedidos()])
      setClientes(clientPage.clientes || [])
      setTotalClientes(clientPage.total || 0)
      setPedidos(Array.isArray(orderResult) ? orderResult : [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void reload() }, [reload])
  const value = useMemo(() => ({ clientes, pedidos, totalClientes, loading, error, reload }), [clientes, pedidos, totalClientes, loading, error, reload])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

function ProtectedLayout() {
  const { token, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="screen-loading"><LoaderCircle className="spin" />Verificando sessão…</div>
  if (!token) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <DataProvider><AppShell><Outlet /></AppShell></DataProvider>
}

function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth()
  const { totalClientes } = useData()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [
    { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
  ]
  const exit = () => { signOut(); navigate('/login', { replace: true }) }
  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand" onClick={() => setMenuOpen(false)}><span className="brand-mark"><Activity size={21} /></span><span>nexo<span className="brand-dot">.</span><small>CRM DE VENDAS</small></span></Link>
      <div className="nav-caption">MENU PRINCIPAL</div>
      <nav className="side-nav">
        {nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Clientes' && <span className="nav-count">{totalClientes}</span>}</NavLink>)}
        <NavLink to="/clientes/novo" onClick={() => setMenuOpen(false) } className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Plus size={18} /><span>Novo cliente</span></NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><MessageCircle size={18} /></div><strong>Precisa de ajuda?</strong><span>Seu CRM, organizado em um só lugar.</span></div><div className="profile-row"><div className="avatar">{userLabel(user).slice(0, 1).toUpperCase()}</div><div className="profile-info"><strong>{userLabel(user)}</strong><span>Atendente</span></div><button className="icon-button logout-button" title="Sair" aria-label="Sair" onClick={exit}><LogOut size={17} /></button></div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><div className="breadcrumb">Workspace <span>/</span> <strong>Visão geral</strong></div><div className="topbar-right"><span className="online-dot" />Tudo atualizado <div className="top-avatar">{userLabel(user).slice(0, 1).toUpperCase()}</div><span className="top-user">{userLabel(user)}</span><button className="icon-button top-logout" title="Sair" onClick={exit}><LogOut size={17} /></button></div></header><div className="page-content">{children}</div><footer className="footer">Nexo CRM <span>·</span> Gestão de relacionamento</footer></main>
  </div>
}

function LoginPage() {
  const { token, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const from = (location.state as { from?: string } | null)?.from || '/'
  if (token) return <Navigate to={from} replace />
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await signIn(username.trim(), password); navigate(from, { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.') }
    finally { setBusy(false) }
  }
  return <div className="login-page"><div className="login-art"><div className="login-art-top"><Link to="/login" className="brand brand-light"><span className="brand-mark"><Activity size={21} /></span><span>nexo<span className="brand-dot">.</span><small>CRM DE VENDAS</small></span></Link><span className="art-label">RELACIONAMENTOS QUE CRESCEM</span></div><div className="art-copy"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-icon"><TrendingUp size={33} /></div><h1>Boas relações.<br /><em>Grandes negócios.</em></h1><p>Clientes, conversas e vendas no mesmo lugar. Seu próximo passo começa aqui.</p><div className="art-stats"><div><strong>+32%</strong><span>crescimento com foco</span></div><div className="stat-divider"/><div><strong>100%</strong><span>visão do cliente</span></div></div></div><div className="art-foot">FEITO PARA CONEXÕES QUE IMPORTAM <span>✳</span></div></div><div className="login-side"><div className="login-card"><div className="login-mobile-brand"><span className="brand-mark"><Activity size={21} /></span><b>nexo<span className="brand-dot">.</span></b></div><div className="login-eyebrow">BEM-VINDO DE VOLTA</div><h2>Acesse sua conta</h2><p className="login-subtitle">Entre para continuar cuidando das suas relações.</p>{error && <div className="alert alert-error" role="alert">{error}</div>}<form onSubmit={submit} className="form-stack"><label>Usuário<span className="input-wrap"><UserRound size={17} /><input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Seu usuário" required /></span></label><label>Senha<span className="input-wrap"><span className="lock-symbol">⌑</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" required /></span></label><button className="button button-primary login-submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} />Entrando…</> : <>Entrar <ArrowRight size={17} /></>}</button></form><div className="login-hint">Conta de teste: <strong>emilys</strong> <span>·</span> senha: <strong>emilyspass</strong></div><div className="login-privacy"><BadgeCheck size={16} /> Ambiente seguro para sua equipe</div></div></div></div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow || 'NEXO CRM'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>
}

function StatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = { aberto: 'Aberto', pago: 'Pago', cancelado: 'Cancelado' }
  return <span className={`status-badge status-${status}`}><i />{label[status] || status}</span>
}
function Seal({ client, orders }: { client: Cliente; orders: Pedido[] }) {
  const seal = seloCliente(client.id, orders)
  return <span className={`seal seal-${seal === 'VIP' ? 'vip' : seal === 'Regular' ? 'regular' : 'empty'}`}>{seal === 'VIP' && <BadgeCheck size={13} />}{seal}</span>
}
function LoadingState({ label = 'Carregando…' }: { label?: string }) { return <div className="state-box"><LoaderCircle size={25} className="spin" /><span>{label}</span></div> }
function ErrorState({ text, retry }: { text: string; retry?: () => void }) { return <div className="state-box state-error"><span className="state-emoji">!</span><strong>Não foi possível carregar</strong><span>{text}</span>{retry && <button className="button button-light button-small" onClick={retry}>Tentar novamente</button>}</div> }
function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) { return <div className="state-box"><span className="empty-icon"><Users size={24} /></span><strong>{title}</strong><span>{text}</span>{action}</div> }

function Dashboard() {
  const { clientes, pedidos, totalClientes, loading, error, reload } = useData()
  const salesOrders = pedidos.filter((order) => order.status !== 'cancelado')
  const sold = salesOrders.reduce((total, order) => total + pedidoTotal(order.itens), 0)
  const average = salesOrders.length ? sold / salesOrders.length : 0
  const ranked = topClientes(clientes, pedidos)
  return <>
    <PageHeading eyebrow="TERÇA-FEIRA, SUA OPERAÇÃO EM FOCO" title="Painel" description="Acompanhe de perto o que acontece com seus clientes e vendas." action={<Link to="/clientes/novo" className="button button-primary"><Plus size={17} />Novo cliente</Link>} />
    {error && <div className="alert alert-error page-alert">{error} <button onClick={() => void reload()}>Tentar novamente</button></div>}
    <section className="metrics-grid">
      <MetricCard icon={<Users />} label="Total de clientes" value={loading ? '—' : String(totalClientes)} meta="na sua carteira" tone="purple" />
      <MetricCard icon={<CircleDollarSign />} label="Total vendido" value={loading ? '—' : money(sold)} meta="sem pedidos cancelados" tone="green" />
      <MetricCard icon={<BarChart3 />} label="Ticket médio" value={loading ? '—' : money(average)} meta="por pedido válido" tone="orange" />
    </section>
    <div className="dashboard-grid"><section className="panel status-panel"><div className="panel-heading"><div><h2>Pedidos por status</h2><p>Volume e valor dos pedidos</p></div><div className="panel-icon"><ClipboardList size={18} /></div></div>{loading ? <LoadingState /> : <div className="status-list">{statuses.map((status) => { const matches = pedidos.filter((order) => order.status === status); const amount = matches.reduce((sum, order) => sum + pedidoTotal(order.itens), 0); return <div className="status-line" key={status}><div className="status-line-title"><StatusBadge status={status} /><span>{matches.length} {matches.length === 1 ? 'pedido' : 'pedidos'}</span></div><strong>{money(amount)}</strong></div> })}</div>}<Link className="panel-link" to="/pedidos">Ver todos os pedidos <ArrowRight size={15} /></Link></section>
      <section className="panel top-panel"><div className="panel-heading"><div><h2>Clientes em destaque</h2><p>Quem mais compra com você</p></div><div className="panel-icon panel-icon-gold"><TrendingUp size={18} /></div></div>{loading ? <LoadingState /> : ranked.length ? <div className="top-client-list">{ranked.map(({ cliente, total }, index) => <Link to={`/clientes/${cliente.id}`} className="top-client-row" key={cliente.id}><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, '0')}</span><span className="mini-avatar">{clientName(cliente).slice(0, 1).toUpperCase()}</span><span className="top-client-name"><strong>{clientName(cliente)}</strong><small>{cliente.empresa || cliente.email}</small></span><strong className="top-client-total">{money(total)}</strong></Link>)}</div> : <EmptyState title="Ainda sem vendas" text="Seus clientes com compras aparecerão aqui." />}<Link className="panel-link" to="/clientes">Explorar clientes <ArrowRight size={15} /></Link></section></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Comece por aqui</h2><p>Atalhos rápidos para sua rotina</p></div></div><div className="shortcut-grid"><Link to="/clientes/novo" className="shortcut-card"><span className="shortcut-icon shortcut-purple"><UserRound size={19} /></span><span><strong>Cadastrar cliente</strong><small>Adicione um novo contato à sua carteira</small></span><ArrowRight size={17} /></Link><Link to="/clientes" className="shortcut-card"><span className="shortcut-icon shortcut-green"><Search size={19} /></span><span><strong>Encontrar cliente</strong><small>Consulte dados e histórico de relacionamento</small></span><ArrowRight size={17} /></Link></div></section>
  </>
}
function MetricCard({ icon, label, value, meta, tone }: { icon: ReactNode; label: string; value: string; meta: string; tone: string }) { return <div className="metric-card"><div className={`metric-icon metric-${tone}`}>{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-meta">{meta}</span></div> }

function ClientList() {
  const { pedidos } = useData()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [clients, setClients] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const limit = 5
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try { const result = await api.clientes(query.trim(), limit, page * limit); if (active) { setClients(result.clientes || []); setTotal(result.total || 0) } }
      catch (reason) { if (active) setError(reason instanceof Error ? reason.message : 'Erro ao buscar clientes.') }
      finally { if (active) setLoading(false) }
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, page, reloadKey])
  const pages = Math.max(1, Math.ceil(total / limit))
  return <><PageHeading eyebrow="RELACIONAMENTO" title="Clientes" description="Sua carteira de relacionamentos, sempre por perto." action={<Link to="/clientes/novo" className="button button-primary"><Plus size={17} />Novo cliente</Link>} />
    <section className="panel clients-panel"><div className="list-toolbar"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} placeholder="Buscar por nome ou e-mail…" aria-label="Buscar por nome ou e-mail" />{query && <button className="icon-button" aria-label="Limpar busca" onClick={() => setQuery('')}><X size={16} /></button>}</div><span className="result-count">{total} {total === 1 ? 'cliente' : 'clientes'}</span></div>
      {loading ? <LoadingState label="Buscando clientes…" /> : error ? <ErrorState text={error} retry={() => setReloadKey((value) => value + 1)} /> : clients.length === 0 ? <EmptyState title={query ? 'Nenhum resultado' : 'Sua carteira começa aqui'} text={query ? 'Tente buscar por outro nome ou e-mail.' : 'Cadastre seu primeiro cliente para começar.'} action={!query && <Link className="button button-primary button-small" to="/clientes/novo"><Plus size={15} />Cadastrar cliente</Link>} /> : <>
        <div className="client-list">{clients.map((client) => <Link to={`/clientes/${client.id}`} className="client-row" key={client.id}><div className="client-avatar">{clientName(client).slice(0, 1).toUpperCase()}</div><div className="client-main"><strong>{clientName(client)}</strong><span>{client.email}</span></div><div className="client-company">{client.empresa && <><Building2 size={15} />{client.empresa}</>}</div><Seal client={client} orders={pedidos} /><div className="client-row-arrow"><ArrowRight size={18} /></div></Link>)}</div>
        <div className="pagination"><span>Mostrando <strong>{page * limit + 1}–{Math.min((page + 1) * limit, total)}</strong> de <strong>{total}</strong></span><div><button className="button button-light button-small" disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={15} />Anterior</button><span className="page-number">{page + 1} / {pages}</span><button className="button button-light button-small" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Próxima<ArrowRight size={15} /></button></div></div>
      </>}</section>
  </>
}

function ClientForm() {
  const { id } = useParams()
  const { reload } = useData()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [values, setValues] = useState({ nome: '', email: '', telefone: '', empresa: '', cidade: '' })
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id) return
    let active = true
    api.cliente(id).then((client) => { if (active) setValues({ nome: client.nome || '', email: client.email || '', telefone: client.telefone || '', empresa: client.empresa || '', cidade: client.cidade || '' }) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Erro ao carregar cliente.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  const set = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!values.nome.trim()) { setError('Informe o nome do cliente.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) { setError('Informe um e-mail válido.'); return }
    if ([values.telefone, values.empresa, values.cidade].filter((value) => value.trim()).length < 2) { setError('Preencha pelo menos dois entre telefone, empresa e cidade.'); return }
    setSaving(true)
    const body = { ...values, nome: values.nome.trim(), email: values.email.trim() }
    try { if (id) { await api.editarCliente(id, body); await reload(); navigate(`/clientes/${id}`, { replace: true }) } else { await api.criarCliente(body); await reload(); navigate('/clientes', { replace: true }) } }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o cliente.') }
    finally { setSaving(false) }
  }
  return <><PageHeading eyebrow="CARTEIRA DE CLIENTES" title={editing ? 'Editar cliente' : 'Novo cliente'} description={editing ? 'Atualize os dados deste relacionamento.' : 'Cadastre os dados para começar a construir uma relação.'} />{loading ? <LoadingState /> : <section className="panel form-panel">{error && <div className="alert alert-error" role="alert">{error}</div>}<form className="client-form" onSubmit={submit}><div className="form-section-title"><span className="form-section-icon"><UserRound size={18} /></span><div><strong>Informações principais</strong><small>Nome e e-mail são obrigatórios.</small></div></div><div className="field-grid"><label>Nome completo <span className="required">*</span><input value={values.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Camila Oliveira" /></label><label>E-mail <span className="required">*</span><input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} placeholder="camila@empresa.com" /></label><label>Telefone<input type="tel" value={values.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(11) 99999-9999" /></label><label>Empresa<input value={values.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nome da empresa" /></label><label className="field-full">Cidade<input value={values.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Cidade" /></label></div><p className="form-note"><span>*</span> Preencha pelo menos dois dados entre telefone, empresa e cidade.</p><div className="form-actions"><Link className="button button-light" to={editing && id ? `/clientes/${id}` : '/clientes'}>Cancelar</Link><button className="button button-primary" disabled={saving}>{saving ? <><LoaderCircle size={17} className="spin" />Salvando…</> : <><Check size={17} />Salvar cliente</>}</button></div></form></section>}</>
}

function ClientDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { reload, pedidos: allOrders } = useData()
  const [client, setClient] = useState<Cliente | null>(null)
  const [orders, setOrders] = useState<Pedido[]>([])
  const [contacts, setContacts] = useState<Atendimento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [channel, setChannel] = useState('todos')
  const [modal, setModal] = useState<'order' | 'contact' | null>(null)
  const [editingOrder, setEditingOrder] = useState<Pedido | null>(null)
  const [editingContact, setEditingContact] = useState<Atendimento | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const [clientResult, orderResult, contactResult] = await Promise.all([api.cliente(id), api.pedidosCliente(id), api.atendimentos(id)]); setClient(clientResult); setOrders(Array.isArray(orderResult) ? orderResult : []); setContacts(Array.isArray(contactResult) ? contactResult : []) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar cliente.') }
    finally { setLoading(false) }
  }, [id])
  useEffect(() => { void load() }, [load])
  const refresh = async (message: string) => { await load(); await reload(); setNotice(message); window.setTimeout(() => setNotice(''), 3500) }
  const deleteClient = async () => {
    if (!client || !window.confirm(`Excluir ${clientName(client)}? ${orders.length} pedido(s) e ${contacts.length} atendimento(s) também serão apagados. Esta ação não pode ser desfeita.`)) return
    setBusy(true); setError('')
    try { await api.excluirCliente(id); await reload(); navigate('/clientes', { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o cliente.') }
    finally { setBusy(false) }
  }
  const removeOrder = async (order: Pedido) => {
    if (!window.confirm('Excluir este pedido? Esta ação não pode ser desfeita.')) return
    setBusy(true); setError('')
    try { await api.excluirPedido(String(order.id)); await refresh('Pedido excluído.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao excluir pedido.') }
    finally { setBusy(false) }
  }
  const updateStatus = async (order: Pedido, status: StatusPedido) => {
    setBusy(true); setError('')
    try { await api.editarPedido(String(order.id), { status }); await refresh('Status do pedido atualizado.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao atualizar status.') }
    finally { setBusy(false) }
  }
  const removeContact = async (contact: Atendimento) => {
    if (!window.confirm('Excluir este atendimento do histórico?')) return
    setBusy(true); setError('')
    try { await api.excluirAtendimento(String(contact.id)); await refresh('Atendimento excluído.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao excluir atendimento.') }
    finally { setBusy(false) }
  }
  const visibleContacts = contacts.filter((contact) => channel === 'todos' || contact.canal === channel).slice().sort((a, b) => new Date(atendimentoDate(b)).getTime() - new Date(atendimentoDate(a)).getTime())
  if (loading) return <LoadingState label="Carregando dados do cliente…" />
  if (error && !client) return error.toLowerCase().includes('não foi encontrado') ? <><PageHeading title="Cliente" /><EmptyState title="Cliente não encontrado" text="Este cliente não existe ou foi removido." action={<Link to="/clientes" className="button button-primary button-small">Voltar para clientes</Link>} /></> : <><PageHeading title="Cliente" /><ErrorState text={error} retry={() => void load()} /></>
  if (!client) return <><PageHeading title="Cliente" /><EmptyState title="Cliente não encontrado" text="Este cliente não existe ou foi removido." action={<Link to="/clientes" className="button button-primary button-small">Voltar para clientes</Link>} /></>
  const clientOrders = orders.length ? orders : allOrders.filter((order) => pedidoClienteId(order) === String(id))
  return <><div className="back-link-row"><Link to="/clientes" className="back-link"><ArrowLeft size={16} />Voltar para clientes</Link></div><PageHeading eyebrow="PERFIL DO CLIENTE" title={clientName(client)} description="Dados, pedidos e histórico em um só lugar." action={<><Link to={`/clientes/${id}/editar`} className="button button-light"><Pencil size={16} />Editar</Link><button className="button button-danger-light" onClick={() => void deleteClient()} disabled={busy}><Trash2 size={16} />Excluir</button></>} />
    {error && <div className="alert alert-error page-alert" role="alert">{error}</div>}{notice && <div className="alert alert-success page-alert"><Check size={16} />{notice}</div>}
    <section className="panel client-profile"><div className="profile-large-avatar">{clientName(client).slice(0, 1).toUpperCase()}</div><div className="profile-details"><div className="profile-name-line"><h2>{clientName(client)}</h2><Seal client={client} orders={clientOrders} /></div><div className="profile-data"><span><Mail size={15} />{client.email}</span>{client.telefone && <span><Phone size={15} />{client.telefone}</span>}{client.empresa && <span><Building2 size={15} />{client.empresa}</span>}{client.cidade && <span><span className="location-dot">⌖</span>{client.cidade}</span>}</div></div><div className="profile-spend"><span>Total comprado</span><strong>{money(totalComprado(client.id, clientOrders))}</strong><small>pedidos não cancelados</small></div></section>
    <section className="panel detail-section"><div className="section-heading"><div className="section-heading-icon orders-heading-icon"><ShoppingBag size={18} /></div><div><h2>Pedidos</h2><p>{clientOrders.length} {clientOrders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}</p></div><button className="button button-primary button-small section-action" onClick={() => { setEditingOrder(null); setModal('order') }}><Plus size={15} />Novo pedido</button></div>
      {clientOrders.length === 0 ? <EmptyState title="Nenhum pedido ainda" text="Adicione o primeiro pedido deste cliente." /> : <div className="order-list">{clientOrders.slice().sort((a, b) => new Date(pedidoDate(b)).getTime() - new Date(pedidoDate(a)).getTime()).map((order) => <div className="order-row" key={order.id}><div className="order-symbol"><ShoppingBag size={17} /></div><div className="order-info"><strong>Pedido #{order.id}</strong><span><CalendarDays size={13} />{dateLabel(pedidoDate(order))} <span className="order-item-count">· {order.itens?.length || 0} {(order.itens?.length || 0) === 1 ? 'item' : 'itens'}</span></span></div><StatusBadge status={order.status} /><strong className="order-total">{money(pedidoTotal(order.itens))}</strong><div className="row-actions">{order.status === 'aberto' && <button className="icon-button" title="Editar itens" onClick={() => { setEditingOrder(order); setModal('order') }}><Pencil size={15} /></button>}{order.status === 'aberto' && <button className="status-action" disabled={busy} onClick={() => void updateStatus(order, 'pago')}>Marcar pago</button>}{(order.status === 'aberto' || order.status === 'pago') && <button className="icon-button" title="Cancelar pedido" disabled={busy} onClick={() => void updateStatus(order, 'cancelado')}><X size={16} /></button>}<button className="icon-button danger-icon" title="Excluir pedido" disabled={busy} onClick={() => void removeOrder(order)}><Trash2 size={15} /></button></div></div>)}</div>}
    </section>
    <section className="panel detail-section"><div className="section-heading"><div className="section-heading-icon history-heading-icon"><MessageCircle size={18} /></div><div><h2>Histórico de atendimento</h2><p>{visibleContacts.length} {visibleContacts.length === 1 ? 'atendimento' : 'atendimentos'}</p></div><button className="button button-primary button-small section-action" onClick={() => { setEditingContact(null); setModal('contact') }}><Plus size={15} />Novo atendimento</button></div><div className="history-filter"><label htmlFor="channel-filter">Filtrar por canal</label><span className="select-wrap"><select id="channel-filter" value={channel} onChange={(e) => setChannel(e.target.value)}><option value="todos">Todos os canais</option>{channels.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown size={15} /></span></div>
      {visibleContacts.length === 0 ? <EmptyState title={contacts.length ? 'Nenhum atendimento neste canal' : 'Histórico vazio'} text={contacts.length ? 'Escolha outro canal para ver os registros.' : 'Registre uma ligação, conversa ou e-mail.'} /> : <div className="timeline">{visibleContacts.map((contact) => <article className="timeline-item" key={contact.id}><span className="timeline-dot"/><div className="timeline-content"><div className="timeline-title-row"><strong>{contact.titulo}</strong><span className="channel-tag">{contact.canal}</span><div className="row-actions"><button className="icon-button" title="Editar atendimento" onClick={() => { setEditingContact(contact); setModal('contact') }}><Pencil size={14} /></button><button className="icon-button danger-icon" title="Excluir atendimento" disabled={busy} onClick={() => void removeContact(contact)}><Trash2 size={14} /></button></div></div><p>{contact.texto}</p><small><CalendarDays size={13} />{dateLabel(atendimentoDate(contact))}</small></div></article>)}</div>}
    </section>
    {modal === 'order' && <OrderModal clientId={id} order={editingOrder} close={() => setModal(null)} saved={async () => { setModal(null); await refresh(editingOrder ? 'Pedido atualizado.' : 'Pedido criado.') }} />}{modal === 'contact' && <ContactModal clientId={id} contact={editingContact} close={() => setModal(null)} saved={async () => { setModal(null); await refresh(editingContact ? 'Atendimento atualizado.' : 'Atendimento registrado.') }} />}
  </>
}

function Modal({ title, description, close, children }: { title: string; description: string; close: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}><section className="modal-card" role="dialog" aria-modal="true"><div className="modal-heading"><div><div className="eyebrow">NEXO CRM</div><h2>{title}</h2><p>{description}</p></div><button className="icon-button" aria-label="Fechar" onClick={close}><X size={19} /></button></div>{children}</section></div> }

function OrderModal({ clientId, order, close, saved }: { clientId: string; order: Pedido | null; close: () => void; saved: () => Promise<void> }) {
  const [items, setItems] = useState<ItemPedido[]>(order?.itens?.length ? order.itens.map((item) => ({ ...item })) : [{ titulo: '', preco: 0, quantidade: 1 }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (index: number, field: keyof ItemPedido, value: string) => setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: field === 'titulo' ? value : value === '' ? Number.NaN : Number(value) } : item))
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!items.length || items.some((item) => !item.titulo.trim() || !Number.isFinite(item.preco) || item.preco < 0 || !Number.isInteger(item.quantidade) || item.quantidade < 1)) { setError('Preencha cada item com título, preço a partir de R$ 0,00 e quantidade inteira a partir de 1.'); return }
    setBusy(true)
    try { if (order) await api.editarPedido(String(order.id), { itens: items }); else await api.criarPedido(clientId, items); await saved() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o pedido.') }
    finally { setBusy(false) }
  }
  return <Modal title={order ? 'Editar pedido' : 'Novo pedido'} description="Adicione os itens e confira o total antes de salvar." close={close}><form className="modal-form" onSubmit={submit}>{error && <div className="alert alert-error" role="alert">{error}</div>}<div className="order-form-head"><span>Item</span><span>Preço (R$)</span><span>Qtd.</span><span /></div>{items.map((item, index) => <div className="order-form-row" key={index}><input aria-label="Título do item" value={item.titulo} onChange={(e) => change(index, 'titulo', e.target.value)} placeholder="Ex.: Consultoria" /><input aria-label="Preço do item" type="number" min="0" step="0.01" value={Number.isNaN(item.preco) ? '' : item.preco} onChange={(e) => change(index, 'preco', e.target.value)} /><input aria-label="Quantidade" type="number" min="1" step="1" value={item.quantidade} onChange={(e) => change(index, 'quantidade', e.target.value)} /><button type="button" className="icon-button danger-icon" title="Remover item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}<button type="button" className="text-button add-item" onClick={() => setItems((current) => [...current, { titulo: '', preco: 0, quantidade: 1 }])}><Plus size={15} />Adicionar item</button><div className="modal-total"><span>Total calculado</span><strong>{money(pedidoTotal(items))}</strong></div><div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{busy ? 'Salvando…' : 'Salvar pedido'}</button></div></form></Modal>
}

function ContactModal({ clientId, contact, close, saved }: { clientId: string; contact: Atendimento | null; close: () => void; saved: () => Promise<void> }) {
  const [values, setValues] = useState({ titulo: contact?.titulo || '', texto: contact?.texto || '', canal: contact?.canal || 'telefone' as Canal })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    if (!values.titulo.trim() || !values.texto.trim()) { setError('Informe o título e o resumo do atendimento.'); return }
    setBusy(true)
    try { if (contact) await api.editarAtendimento(String(contact.id), values); else await api.criarAtendimento(clientId, values); await saved() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o atendimento.') }
    finally { setBusy(false) }
  }
  return <Modal title={contact ? 'Editar atendimento' : 'Novo atendimento'} description="Registre os detalhes para manter o histórico atualizado." close={close}><form className="modal-form" onSubmit={submit}>{error && <div className="alert alert-error" role="alert">{error}</div>}<label>Título<input value={values.titulo} onChange={(e) => setValues({ ...values, titulo: e.target.value })} placeholder="Ex.: Retorno sobre proposta" /></label><label>Canal<span className="select-wrap select-full"><select value={values.canal} onChange={(e) => setValues({ ...values, canal: e.target.value as Canal })}>{channels.map((channelName) => <option key={channelName}>{channelName}</option>)}</select><ChevronDown size={15} /></span></label><label>Resumo da conversa<textarea rows={4} value={values.texto} onChange={(e) => setValues({ ...values, texto: e.target.value })} placeholder="O que foi conversado?" /></label><div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}{busy ? 'Salvando…' : 'Salvar atendimento'}</button></div></form></Modal>
}

function OrdersPage() {
  const { pedidos, clientes, loading, error, reload } = useData()
  const [status, setStatus] = useState('todos')
  const [range, setRange] = useState('todos')
  const [sort, setSort] = useState('recentes')
  const clientById = new Map(clientes.map((client) => [String(client.id), client]))
  const filtered = pedidos.filter((order) => {
    const total = pedidoTotal(order.itens)
    const inStatus = status === 'todos' || order.status === status
    const inRange = range === 'todos' || (range === 'under500' && total < 500) || (range === '500to2000' && total >= 500 && total < 2000) || (range === 'over2000' && total >= 2000)
    return inStatus && inRange
  }).slice().sort((a, b) => sort === 'valor-maior' ? pedidoTotal(b.itens) - pedidoTotal(a.itens) : sort === 'valor-menor' ? pedidoTotal(a.itens) - pedidoTotal(b.itens) : sort === 'antigos' ? new Date(pedidoDate(a)).getTime() - new Date(pedidoDate(b)).getTime() : new Date(pedidoDate(b)).getTime() - new Date(pedidoDate(a)).getTime())
  return <><PageHeading eyebrow="ACOMPANHAMENTO DE VENDAS" title="Pedidos" description="Acompanhe todos os pedidos e seus valores." /><section className="panel orders-page-panel"><div className="filters-row"><div className="filter-control"><label>Status</label><span className="select-wrap"><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos</option>{statuses.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select><ChevronDown size={15} /></span></div><div className="filter-control"><label>Faixa de valor</label><span className="select-wrap"><select value={range} onChange={(e) => setRange(e.target.value)}><option value="todos">Qualquer valor</option><option value="under500">Até R$ 499,99</option><option value="500to2000">R$ 500 a R$ 1.999,99</option><option value="over2000">R$ 2.000 ou mais</option></select><ChevronDown size={15} /></span></div><div className="filter-control filter-sort"><label>Ordenar por</label><span className="select-wrap"><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="valor-maior">Maior valor</option><option value="valor-menor">Menor valor</option></select><ArrowDownUp size={15} /></span></div><span className="result-count filter-count">{filtered.length} pedidos</span></div>{loading ? <LoadingState /> : error ? <ErrorState text={error} retry={() => void reload()} /> : filtered.length === 0 ? <EmptyState title="Nenhum pedido encontrado" text="Altere os filtros ou cadastre um pedido no perfil do cliente." /> : <div className="all-orders-list">{filtered.map((order) => { const client = clientById.get(pedidoClienteId(order)); return <Link to={client ? `/clientes/${client.id}` : '/clientes'} className="all-order-row" key={order.id}><span className="order-symbol"><ShoppingBag size={17} /></span><span className="all-order-client"><strong>{client ? clientName(client) : 'Cliente não encontrado'}</strong><small>Pedido #{order.id} · {order.itens?.length || 0} itens</small></span><span className="all-order-date"><CalendarDays size={14} />{dateLabel(pedidoDate(order))}</span><StatusBadge status={order.status} /><strong className="order-total">{money(pedidoTotal(order.itens))}</strong><ArrowRight className="client-row-arrow" size={17} /></Link> })}</div>}</section></>
}

function NotFound() { return <div className="not-found"><div className="not-found-code">404</div><div className="eyebrow">PÁGINA NÃO ENCONTRADA</div><h1>Ops, esse caminho não existe.</h1><p>Talvez o endereço tenha mudado ou o link esteja incorreto.</p><Link to="/" className="button button-primary"><ArrowLeft size={16} />Voltar ao painel</Link></div> }

export default function CRMApp() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedLayout />}><Route index element={<Dashboard />} /><Route path="clientes" element={<ClientList />} /><Route path="clientes/novo" element={<ClientForm />} /><Route path="clientes/:id/editar" element={<ClientForm />} /><Route path="clientes/:id" element={<ClientDetail />} /><Route path="pedidos" element={<OrdersPage />} /><Route path="*" element={<NotFound />} /></Route></Routes>
}
