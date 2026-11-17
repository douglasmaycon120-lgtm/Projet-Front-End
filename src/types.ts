export type Cliente = {
  id: string | number
  nome: string
  email: string
  telefone?: string
  empresa?: string
  cidade?: string
  createdAt?: string
  [key: string]: unknown
}

export type ItemPedido = { titulo: string; preco: number; quantidade: number }
export type StatusPedido = 'aberto' | 'pago' | 'cancelado'
export type Pedido = {
  id: string | number
  clienteId?: string | number
  cliente_id?: string | number
  idCliente?: string | number
  itens: ItemPedido[]
  status: StatusPedido
  data?: string
  createdAt?: string
  [key: string]: unknown
}
export type Canal = 'telefone' | 'e-mail' | 'WhatsApp' | 'presencial'
export type Atendimento = {
  id: string | number
  titulo: string
  texto: string
  canal: Canal
  data?: string
  createdAt?: string
  [key: string]: unknown
}
export type ApiClientePage = { clientes: Cliente[]; total: number }
export type ApiUser = { id?: string | number; username?: string; nome?: string; name?: string; email?: string }
