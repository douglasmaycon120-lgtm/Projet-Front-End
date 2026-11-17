import type { ApiClientePage, ApiUser, Atendimento, Cliente, ItemPedido, Pedido } from './types'
import { errorMessage } from './utils'

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  if (!API_URL) throw new ApiError(500, 'Configure VITE_API_URL no arquivo .env e reinicie o Vite.')
  try {
    const token = localStorage.getItem('crm-token')
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    if (!response.ok) {
      if (response.status === 401 && auth) window.dispatchEvent(new Event('crm:unauthorized'))
      let detail = ''
      try {
        const body = await response.json() as { message?: string; erro?: string }
        detail = body.message || body.erro || ''
      } catch { /* A resposta pode não conter JSON. */ }
      const message = !auth && response.status === 401 ? 'Usuário ou senha incorretos.' : errorMessage(response.status, detail)
      throw new ApiError(response.status, message)
    }
    if (response.status === 204) return undefined as T
    return await response.json() as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(500, 'Sem conexão com o servidor. Verifique se a API está ligada.')
  }
}

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
const encoded = (id: string | number) => encodeURIComponent(String(id))

export const api = {
  login: (username: string, password: string) => request<{ accessToken: string }>('/auth/login', json('POST', { username, password }), false),
  me: () => request<ApiUser>('/auth/me'),
  clientes: async (q = '', limit = 100, skip = 0): Promise<ApiClientePage> => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) })
    if (q) params.set('q', q)
    const response = await request<ApiClientePage | Cliente[]>(`/clientes?${params}`)
    return Array.isArray(response) ? { clientes: response, total: response.length } : response
  },
  cliente: async (id: string) => {
    const response = await request<Cliente | { cliente: Cliente }>(`/clientes/${encoded(id)}`)
    return ('cliente' in response ? response.cliente : response) as Cliente
  },
  criarCliente: (body: Omit<Cliente, 'id'>) => request<Cliente>('/clientes', json('POST', body)),
  editarCliente: (id: string, body: Partial<Cliente>) => request<Cliente>(`/clientes/${encoded(id)}`, json('PATCH', body)),
  excluirCliente: (id: string) => request<void>(`/clientes/${encoded(id)}`, json('DELETE')),
  pedidos: async () => {
    const response = await request<Pedido[] | { pedidos: Pedido[] }>('/pedidos')
    return Array.isArray(response) ? response : response.pedidos
  },
  pedidosCliente: async (id: string) => {
    const response = await request<Pedido[] | { pedidos: Pedido[] }>(`/clientes/${encoded(id)}/pedidos`)
    return Array.isArray(response) ? response : response.pedidos
  },
  criarPedido: (id: string, itens: ItemPedido[]) => request<Pedido>(`/clientes/${encoded(id)}/pedidos`, json('POST', { itens })),
  editarPedido: (id: string, body: { itens?: ItemPedido[]; status?: string }) => request<Pedido>(`/pedidos/${encoded(id)}`, json('PATCH', body)),
  excluirPedido: (id: string) => request<void>(`/pedidos/${encoded(id)}`, json('DELETE')),
  atendimentos: async (id: string) => {
    const response = await request<Atendimento[] | { atendimentos: Atendimento[] }>(`/clientes/${encoded(id)}/atendimentos`)
    return Array.isArray(response) ? response : response.atendimentos
  },
  criarAtendimento: (id: string, body: Pick<Atendimento, 'titulo' | 'texto' | 'canal'>) => request<Atendimento>(`/clientes/${encoded(id)}/atendimentos`, json('POST', body)),
  editarAtendimento: (id: string, body: Partial<Pick<Atendimento, 'titulo' | 'texto' | 'canal'>>) => request<Atendimento>(`/atendimentos/${encoded(id)}`, json('PATCH', body)),
  excluirAtendimento: (id: string) => request<void>(`/atendimentos/${encoded(id)}`, json('DELETE')),
}
