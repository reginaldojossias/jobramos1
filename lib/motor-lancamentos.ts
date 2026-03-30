/**
 * Motor de Lançamentos Contabilísticos - Partidas Dobradas
 * 
 * Este módulo implementa o sistema de partidas dobradas para contabilidade,
 * gerando automaticamente os lançamentos contabilísticos quando documentos
 * são criados no sistema (facturas, recibos, despesas, salários, etc.)
 * 
 * Baseado no PGC-NIRF (Plano Geral de Contabilidade - Moçambique)
 */

import { createClient as createClientServer } from "@/lib/supabase/server"
import { createClient as createClientBrowser } from "@/lib/supabase/client"

// ============================================================================
// CÓDIGOS DAS CONTAS DO PLANO DE CONTAS (PGC-NIRF)
// ============================================================================

export const CONTAS = {
  // Classe 3 - Terceiros
  CLIENTES: "311",           // Clientes c/c
  FORNECEDORES: "321",       // Fornecedores c/c
  IVA_LIQUIDADO: "3433",     // IVA Liquidado (nas vendas)
  IVA_DEDUTIVEL: "3432",     // IVA Dedutível (nas compras)
  IVA_SUPORTADO: "3431",     // IVA Suportado
  IVA_A_PAGAR: "3436",       // IVA a Pagar
  IRPS_A_PAGAR: "342",       // IRPS a Pagar
  INSS_A_PAGAR: "344",       // INSS a Pagar
  
  // Classe 4 - Meios Monetários
  CAIXA: "41",               // Caixa
  BANCO: "42",               // Depósitos à Ordem
  
  // Classe 6 - Custos e Perdas
  CMVMC: "61",               // Custo das Mercadorias Vendidas
  FST: "6219",               // Fornecimentos e Serviços de Terceiros (genérico)
  CUSTOS_PESSOAL: "641",     // Remunerações do Pessoal
  ENCARGOS_PESSOAL: "642",   // Encargos sobre Remunerações
  
  // Classe 7 - Proveitos e Ganhos
  VENDAS_MERCADORIAS: "711", // Vendas de Mercadorias
  VENDAS_PRODUTOS: "712",    // Vendas de Produtos
  PRESTACAO_SERVICOS: "72",  // Prestações de Serviços
} as const

// ============================================================================
// TIPOS
// ============================================================================

export type TipoOrigem = 
  | "factura" 
  | "nota_credito" 
  | "nota_debito"
  | "recibo" 
  | "despesa" 
  | "movimento_bancario" 
  | "folha_salario"
  | "ajuste_manual"

export interface LinhaLancamento {
  conta_codigo: string
  descricao: string
  debito: number
  credito: number
}

export interface DadosLancamento {
  empresa_id: string
  data: string
  descricao: string
  tipo_origem: TipoOrigem
  origem_id: string
  origem_numero?: string
  linhas: LinhaLancamento[]
}

export interface ResultadoLancamento {
  success: boolean
  lancamento_id?: string
  error?: string
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Valida se o lançamento está equilibrado (débitos = créditos)
 */
function validarEquilibrio(linhas: LinhaLancamento[]): boolean {
  const totalDebito = linhas.reduce((sum, l) => sum + l.debito, 0)
  const totalCredito = linhas.reduce((sum, l) => sum + l.credito, 0)
  // Tolerância de 0.01 para evitar problemas de arredondamento
  return Math.abs(totalDebito - totalCredito) < 0.01
}

/**
 * Arredonda valor para 2 casas decimais
 */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

// ============================================================================
// MOTOR DE LANÇAMENTOS
// ============================================================================

/**
 * Cria um lançamento contabilístico no sistema
 */
export async function criarLancamento(
  dados: DadosLancamento,
  isServer: boolean = false
): Promise<ResultadoLancamento> {
  try {
    // Validar equilíbrio
    if (!validarEquilibrio(dados.linhas)) {
      const totalD = dados.linhas.reduce((s, l) => s + l.debito, 0)
      const totalC = dados.linhas.reduce((s, l) => s + l.credito, 0)
      return {
        success: false,
        error: `Lançamento não equilibrado: Débito=${totalD.toFixed(2)}, Crédito=${totalC.toFixed(2)}`,
      }
    }

    // Criar cliente Supabase
    const supabase = isServer ? await createClientServer() : createClientBrowser()

    // Calcular totais
    const totalDebito = dados.linhas.reduce((sum, l) => sum + l.debito, 0)
    const totalCredito = dados.linhas.reduce((sum, l) => sum + l.credito, 0)

    // Inserir lançamento principal
    const { data: lancamento, error: errorLancamento } = await supabase
      .from("lancamentos")
      .insert({
        empresa_id: dados.empresa_id,
        data: dados.data,
        descricao: dados.descricao,
        tipo_origem: dados.tipo_origem,
        origem_id: dados.origem_id,
        origem_numero: dados.origem_numero || null,
        total_debito: arredondar(totalDebito),
        total_credito: arredondar(totalCredito),
        estado: "rascunho",
      })
      .select("id")
      .single()

    if (errorLancamento) {
      console.error("[v0] Erro ao criar lançamento:", errorLancamento)
      return { success: false, error: errorLancamento.message }
    }

    // Inserir linhas do lançamento
    const linhasParaInserir = dados.linhas.map((linha, index) => ({
      lancamento_id: lancamento.id,
      conta_codigo: linha.conta_codigo,
      descricao: linha.descricao,
      debito: arredondar(linha.debito),
      credito: arredondar(linha.credito),
      ordem: index + 1,
    }))

    const { error: errorLinhas } = await supabase
      .from("lancamento_linhas")
      .insert(linhasParaInserir)

    if (errorLinhas) {
      // Rollback: apagar o lançamento criado
      await supabase.from("lancamentos").delete().eq("id", lancamento.id)
      console.error("[v0] Erro ao criar linhas:", errorLinhas)
      return { success: false, error: errorLinhas.message }
    }

    return { success: true, lancamento_id: lancamento.id }
  } catch (error: any) {
    console.error("[v0] Erro no motor de lançamentos:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Anula um lançamento existente (cria lançamento de estorno)
 */
export async function anularLancamento(
  lancamentoId: string,
  empresaId: string,
  motivo: string,
  isServer: boolean = false
): Promise<ResultadoLancamento> {
  try {
    const supabase = isServer ? await createClientServer() : createClientBrowser()

    // Buscar lançamento original com linhas
    const { data: lancamentoOriginal, error: errorBusca } = await supabase
      .from("lancamentos")
      .select("*, lancamento_linhas(*)")
      .eq("id", lancamentoId)
      .single()

    if (errorBusca || !lancamentoOriginal) {
      return { success: false, error: "Lançamento não encontrado" }
    }

    if (lancamentoOriginal.estado === "anulado") {
      return { success: false, error: "Lançamento já está anulado" }
    }

    // Criar lançamento de estorno (inverte débitos e créditos)
    const linhasEstorno: LinhaLancamento[] = lancamentoOriginal.lancamento_linhas.map((l: any) => ({
      conta_codigo: l.conta_codigo,
      descricao: `Estorno: ${l.descricao}`,
      debito: l.credito, // Inverte
      credito: l.debito, // Inverte
    }))

    const resultadoEstorno = await criarLancamento({
      empresa_id: empresaId,
      data: new Date().toISOString().split("T")[0],
      descricao: `Estorno: ${lancamentoOriginal.descricao} - ${motivo}`,
      tipo_origem: lancamentoOriginal.tipo_origem,
      origem_id: lancamentoOriginal.origem_id,
      origem_numero: lancamentoOriginal.origem_numero,
      linhas: linhasEstorno,
    }, isServer)

    if (!resultadoEstorno.success) {
      return resultadoEstorno
    }

    // Marcar lançamento original como anulado
    await supabase
      .from("lancamentos")
      .update({ estado: "anulado" })
      .eq("id", lancamentoId)

    return { success: true, lancamento_id: resultadoEstorno.lancamento_id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ============================================================================
// GERADORES DE LANÇAMENTOS POR TIPO DE DOCUMENTO
// ============================================================================

/**
 * Gera lançamento para uma Factura (FT)
 * 
 * Débito: 311 Clientes (valor total com IVA)
 * Crédito: 711/72 Vendas/Serviços (valor sem IVA)
 * Crédito: 3433 IVA Liquidado (valor do IVA)
 */
export async function lancarFactura(params: {
  empresa_id: string
  factura_id: string
  numero: string
  data: string
  cliente_nome: string
  subtotal: number
  iva: number
  total: number
  tipo_venda?: "mercadorias" | "servicos"
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, factura_id, numero, data, cliente_nome, 
    subtotal, iva, total, tipo_venda = "mercadorias", isServer = false 
  } = params

  const contaVendas = tipo_venda === "servicos" ? CONTAS.PRESTACAO_SERVICOS : CONTAS.VENDAS_MERCADORIAS

  const linhas: LinhaLancamento[] = [
    {
      conta_codigo: CONTAS.CLIENTES,
      descricao: `${cliente_nome} - FT ${numero}`,
      debito: arredondar(total),
      credito: 0,
    },
    {
      conta_codigo: contaVendas,
      descricao: `Venda FT ${numero}`,
      debito: 0,
      credito: arredondar(subtotal),
    },
  ]

  // Só adiciona linha de IVA se houver IVA
  if (iva > 0) {
    linhas.push({
      conta_codigo: CONTAS.IVA_LIQUIDADO,
      descricao: `IVA FT ${numero}`,
      debito: 0,
      credito: arredondar(iva),
    })
  }

  return criarLancamento({
    empresa_id,
    data,
    descricao: `Factura ${numero} - ${cliente_nome}`,
    tipo_origem: "factura",
    origem_id: factura_id,
    origem_numero: numero,
    linhas,
  }, isServer)
}

/**
 * Gera lançamento para uma Nota de Crédito (NC)
 * 
 * Débito: 711/72 Vendas/Serviços (valor sem IVA) - reduz vendas
 * Débito: 3433 IVA Liquidado (valor do IVA) - reduz IVA a pagar
 * Crédito: 311 Clientes (valor total) - reduz dívida do cliente
 */
export async function lancarNotaCredito(params: {
  empresa_id: string
  nc_id: string
  numero: string
  data: string
  cliente_nome: string
  subtotal: number
  iva: number
  total: number
  factura_ref?: string
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, nc_id, numero, data, cliente_nome,
    subtotal, iva, total, factura_ref, isServer = false 
  } = params

  const descRef = factura_ref ? ` (ref. FT ${factura_ref})` : ""

  const linhas: LinhaLancamento[] = [
    {
      conta_codigo: CONTAS.VENDAS_MERCADORIAS,
      descricao: `NC ${numero} - Anulação venda${descRef}`,
      debito: arredondar(subtotal),
      credito: 0,
    },
    {
      conta_codigo: CONTAS.CLIENTES,
      descricao: `${cliente_nome} - NC ${numero}`,
      debito: 0,
      credito: arredondar(total),
    },
  ]

  if (iva > 0) {
    linhas.push({
      conta_codigo: CONTAS.IVA_LIQUIDADO,
      descricao: `IVA NC ${numero} - Regularização`,
      debito: arredondar(iva),
      credito: 0,
    })
  }

  return criarLancamento({
    empresa_id,
    data,
    descricao: `Nota de Crédito ${numero} - ${cliente_nome}${descRef}`,
    tipo_origem: "nota_credito",
    origem_id: nc_id,
    origem_numero: numero,
    linhas,
  }, isServer)
}

/**
 * Gera lançamento para um Recibo (REC)
 * 
 * Débito: 41/42 Caixa/Banco (valor recebido)
 * Crédito: 311 Clientes (valor recebido)
 */
export async function lancarRecibo(params: {
  empresa_id: string
  recibo_id: string
  numero: string
  data: string
  cliente_nome: string
  valor: number
  meio_pagamento: "dinheiro" | "transferencia" | "cheque" | "outro"
  factura_ref?: string
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, recibo_id, numero, data, cliente_nome, 
    valor, meio_pagamento, factura_ref, isServer = false 
  } = params

  // Determinar conta de destino baseado no meio de pagamento
  const contaDestino = meio_pagamento === "dinheiro" ? CONTAS.CAIXA : CONTAS.BANCO
  const descRef = factura_ref ? ` (ref. FT ${factura_ref})` : ""

  const linhas: LinhaLancamento[] = [
    {
      conta_codigo: contaDestino,
      descricao: `Recebimento REC ${numero}`,
      debito: arredondar(valor),
      credito: 0,
    },
    {
      conta_codigo: CONTAS.CLIENTES,
      descricao: `${cliente_nome} - REC ${numero}${descRef}`,
      debito: 0,
      credito: arredondar(valor),
    },
  ]

  return criarLancamento({
    empresa_id,
    data,
    descricao: `Recibo ${numero} - ${cliente_nome}${descRef}`,
    tipo_origem: "recibo",
    origem_id: recibo_id,
    origem_numero: numero,
    linhas,
  }, isServer)
}

/**
 * Gera lançamento para uma Despesa
 * 
 * Débito: 62x FST ou conta específica (valor sem IVA)
 * Débito: 3432 IVA Dedutível (valor do IVA, se aplicável)
 * Crédito: 321 Fornecedores / 41 Caixa / 42 Banco (valor total)
 */
export async function lancarDespesa(params: {
  empresa_id: string
  despesa_id: string
  numero?: string
  data: string
  descricao: string
  fornecedor_nome?: string
  subtotal: number
  iva: number
  total: number
  conta_custo?: string
  forma_pagamento: "pendente" | "dinheiro" | "transferencia" | "cheque"
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, despesa_id, numero, data, descricao, fornecedor_nome,
    subtotal, iva, total, conta_custo = CONTAS.FST, 
    forma_pagamento, isServer = false 
  } = params

  const linhas: LinhaLancamento[] = [
    {
      conta_codigo: conta_custo,
      descricao: descricao,
      debito: arredondar(subtotal),
      credito: 0,
    },
  ]

  // Adicionar IVA dedutível se houver
  if (iva > 0) {
    linhas.push({
      conta_codigo: CONTAS.IVA_DEDUTIVEL,
      descricao: `IVA - ${descricao}`,
      debito: arredondar(iva),
      credito: 0,
    })
  }

  // Determinar conta de crédito baseado na forma de pagamento
  let contaCredito: string
  if (forma_pagamento === "pendente") {
    contaCredito = CONTAS.FORNECEDORES
  } else if (forma_pagamento === "dinheiro") {
    contaCredito = CONTAS.CAIXA
  } else {
    contaCredito = CONTAS.BANCO
  }

  linhas.push({
    conta_codigo: contaCredito,
    descricao: fornecedor_nome ? `${fornecedor_nome} - ${descricao}` : descricao,
    debito: 0,
    credito: arredondar(total),
  })

  return criarLancamento({
    empresa_id,
    data,
    descricao: `Despesa: ${descricao}${numero ? ` (${numero})` : ""}`,
    tipo_origem: "despesa",
    origem_id: despesa_id,
    origem_numero: numero,
    linhas,
  }, isServer)
}

/**
 * Gera lançamento para Folha de Salários
 * 
 * Débito: 641 Remunerações do Pessoal (salário bruto)
 * Débito: 642 Encargos sobre Remunerações (INSS patronal)
 * Crédito: 342 IRPS a Pagar
 * Crédito: 344 INSS a Pagar (trabalhador + patronal)
 * Crédito: 41/42 Caixa/Banco (salário líquido)
 */
export async function lancarFolhaSalario(params: {
  empresa_id: string
  folha_id: string
  funcionario_nome: string
  mes: number
  ano: number
  salario_bruto: number
  inss_trabalhador: number
  irps: number
  inss_empresa: number
  salario_liquido: number
  forma_pagamento: "dinheiro" | "transferencia"
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, folha_id, funcionario_nome, mes, ano,
    salario_bruto, inss_trabalhador, irps, inss_empresa, 
    salario_liquido, forma_pagamento, isServer = false 
  } = params

  const periodo = `${String(mes).padStart(2, "0")}/${ano}`
  const contaPagamento = forma_pagamento === "dinheiro" ? CONTAS.CAIXA : CONTAS.BANCO

  const linhas: LinhaLancamento[] = [
    // Custo do salário bruto
    {
      conta_codigo: CONTAS.CUSTOS_PESSOAL,
      descricao: `Salário ${funcionario_nome} - ${periodo}`,
      debito: arredondar(salario_bruto),
      credito: 0,
    },
    // Encargos patronais (INSS empresa)
    {
      conta_codigo: CONTAS.ENCARGOS_PESSOAL,
      descricao: `INSS Patronal ${funcionario_nome} - ${periodo}`,
      debito: arredondar(inss_empresa),
      credito: 0,
    },
    // IRPS retido
    {
      conta_codigo: CONTAS.IRPS_A_PAGAR,
      descricao: `IRPS ${funcionario_nome} - ${periodo}`,
      debito: 0,
      credito: arredondar(irps),
    },
    // INSS a pagar (trabalhador + empresa)
    {
      conta_codigo: CONTAS.INSS_A_PAGAR,
      descricao: `INSS ${funcionario_nome} - ${periodo}`,
      debito: 0,
      credito: arredondar(inss_trabalhador + inss_empresa),
    },
    // Pagamento líquido
    {
      conta_codigo: contaPagamento,
      descricao: `Pagamento salário ${funcionario_nome} - ${periodo}`,
      debito: 0,
      credito: arredondar(salario_liquido),
    },
  ]

  return criarLancamento({
    empresa_id,
    data: new Date().toISOString().split("T")[0],
    descricao: `Salário ${funcionario_nome} - ${periodo}`,
    tipo_origem: "folha_salario",
    origem_id: folha_id,
    origem_numero: `SAL-${periodo}-${funcionario_nome.substring(0, 10)}`,
    linhas,
  }, isServer)
}

/**
 * Gera lançamento para Movimento Bancário (transferência, depósito, etc.)
 * 
 * Débito/Crédito depende do tipo de movimento
 */
export async function lancarMovimentoBancario(params: {
  empresa_id: string
  movimento_id: string
  data: string
  descricao: string
  valor: number
  tipo: "entrada" | "saida"
  conta_origem?: string
  conta_destino?: string
  isServer?: boolean
}): Promise<ResultadoLancamento> {
  const { 
    empresa_id, movimento_id, data, descricao, valor, 
    tipo, conta_origem = CONTAS.BANCO, conta_destino = CONTAS.CAIXA,
    isServer = false 
  } = params

  const linhas: LinhaLancamento[] = tipo === "entrada" 
    ? [
        { conta_codigo: conta_destino, descricao, debito: arredondar(valor), credito: 0 },
        { conta_codigo: conta_origem, descricao, debito: 0, credito: arredondar(valor) },
      ]
    : [
        { conta_codigo: conta_origem, descricao, debito: 0, credito: arredondar(valor) },
        { conta_codigo: conta_destino, descricao, debito: arredondar(valor), credito: 0 },
      ]

  return criarLancamento({
    empresa_id,
    data,
    descricao: `Movimento: ${descricao}`,
    tipo_origem: "movimento_bancario",
    origem_id: movimento_id,
    linhas,
  }, isServer)
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Busca lançamentos por origem (documento)
 */
export async function buscarLancamentosPorOrigem(
  origem_id: string,
  isServer: boolean = false
) {
  const supabase = isServer ? await createClientServer() : createClientBrowser()
  
  const { data, error } = await supabase
    .from("lancamentos")
    .select("*, lancamento_linhas(*)")
    .eq("origem_id", origem_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Erro ao buscar lançamentos:", error)
    return []
  }

  return data || []
}

/**
 * Verifica se já existe lançamento para um documento
 */
export async function existeLancamento(
  origem_id: string,
  isServer: boolean = false
): Promise<boolean> {
  const lancamentos = await buscarLancamentosPorOrigem(origem_id, isServer)
  return lancamentos.some(l => l.estado !== "anulado")
}
