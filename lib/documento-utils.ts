/**
 * Utilitarios partilhados para documentos fiscais (facturas, NC, ND, recibos)
 * Conformidade com legislacao mocambicana (Decreto 70/2009)
 */

export const TAXAS_IVA = [
  { valor: 0, label: "Isento (0%)" },
  { valor: 5, label: "Reduzida (5%)" },
  { valor: 16, label: "Normal (16%)" },
] as const

export const FORMAS_PAGAMENTO = [
  { valor: "Numerario", label: "Numerario" },
  { valor: "Transferencia", label: "Transferencia Bancaria" },
  { valor: "Cheque", label: "Cheque" },
  { valor: "M-Pesa", label: "M-Pesa" },
  { valor: "E-Mola", label: "E-Mola" },
  { valor: "Outro", label: "Outro" },
] as const

export const TIPO_DOCUMENTO_LABELS: Record<string, string> = {
  FT: "Factura",
  NC: "Nota de Credito",
  ND: "Nota de Debito",
  RC: "Recibo",
}

export const TIPO_DOCUMENTO_CORES: Record<string, string> = {
  FT: "bg-primary/10 text-primary",
  NC: "bg-red-500/10 text-red-600",
  ND: "bg-amber-500/10 text-amber-600",
  RC: "bg-green-500/10 text-green-600",
}

export const ESTADO_CORES: Record<string, string> = {
  Pendente: "bg-amber-500/10 text-amber-600",
  "Parcialmente Pago": "bg-blue-500/10 text-blue-600",
  Pago: "bg-green-500/10 text-green-600",
  Paga: "bg-green-500/10 text-green-600",
  Cancelada: "bg-red-500/10 text-red-600",
  Cancelado: "bg-red-500/10 text-red-600",
  Vencida: "bg-red-500/10 text-red-600",
  Parcial: "bg-blue-500/10 text-blue-600",
  Emitida: "bg-sky-500/10 text-sky-600",
  "Parcialmente Creditada": "bg-orange-500/10 text-orange-600",
  Creditada: "bg-red-500/10 text-red-600",
  "Creditada Apos Pagamento": "bg-rose-600/10 text-rose-700",
  Debitada: "bg-purple-500/10 text-purple-600",
}

/**
 * Calcula IVA por linha de item
 */
export function calcularIvaLinha(subtotalLinha: number, taxaIva: number): number {
  return Math.round(subtotalLinha * (taxaIva / 100) * 100) / 100
}

/**
 * Calcula totais de um documento a partir dos itens
 */
export function calcularTotaisDocumento(
  itens: Array<{ quantidade: number; preco_unitario: number; taxa_iva: number }>
) {
  let subtotal = 0
  let totalIva = 0

  for (const item of itens) {
    const subtotalLinha = item.quantidade * item.preco_unitario
    const ivaLinha = calcularIvaLinha(subtotalLinha, item.taxa_iva)
    subtotal += subtotalLinha
    totalIva += ivaLinha
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    iva: Math.round(totalIva * 100) / 100,
    total: Math.round((subtotal + totalIva) * 100) / 100,
  }
}

/**
 * Formatar valor em MZN
 */
export function formatarMZN(valor: number): string {
  return new Intl.NumberFormat("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor)
}

/**
 * Formatar data no formato pt-PT
 */
export function formatarData(data: string | Date): string {
  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formatar data por extenso
 */
export function formatarDataExtenso(data: string | Date): string {
  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/**
 * Verificar se uma factura esta vencida
 */
export function facturaVencida(dataVencimento: string | null, estado: string): boolean {
  if (!dataVencimento || estado === "Pago" || estado === "Paga" || estado === "Cancelada") return false
  return new Date(dataVencimento) < new Date()
}
