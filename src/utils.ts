import type { Cliente, ItemPedido, Pedido } from './types'

export const pedidoTotal = (itens: ItemPedido[] = []): number =>
  itens.reduce((total, item) => total + Number(item.preco || 0) * Number(item.quantidade || 0), 0)

export const pedidoClienteId = (pedido: Pedido): string =>
  String(pedido.clienteId ?? pedido.cliente_id ?? pedido.idCliente ?? '')

export const totalComprado = (clienteId: string | number, pedidos: Pedido[]): number =>
  pedidos
    .filter((pedido) => pedidoClienteId(pedido) === String(clienteId) && pedido.status !== 'cancelado')
    .reduce((total, pedido) => total + pedidoTotal(pedido.itens), 0)

export const seloCliente = (clienteId: string | number, pedidos: Pedido[]): 'VIP' | 'Regular' | 'Sem compras' => {
  const validos = pedidos.filter((pedido) => pedidoClienteId(pedido) === String(clienteId) && pedido.status !== 'cancelado')
  if (validos.length === 0) return 'Sem compras'
  return totalComprado(clienteId, pedidos) >= 2000 ? 'VIP' : 'Regular'
}

export const topClientes = (clientes: Cliente[], pedidos: Pedido[]) =>
  clientes
    .map((cliente) => ({ cliente, total: totalComprado(cliente.id, pedidos) }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

export const money = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

export const dateLabel = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date)
}

export const pedidoDate = (pedido: Pedido) => pedido.data ?? pedido.createdAt ?? String(pedido.created_at ?? '')
export const atendimentoDate = (atendimento: { data?: string; createdAt?: string; created_at?: unknown }) =>
  atendimento.data ?? atendimento.createdAt ?? String(atendimento.created_at ?? '')

export const errorMessage = (status: number, fallback?: string) => {
  if (status === 400) return 'Confira os dados informados e tente novamente.'
  if (status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (status === 404) return 'O registro solicitado não foi encontrado.'
  if (status === 409) return 'Este e-mail já está cadastrado.'
  if (status >= 500) return 'O servidor apresentou um erro. Tente novamente em instantes.'
  return fallback || 'Não foi possível concluir a operação.'
}
