"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import type { Empresa, Cliente } from "@/lib/types"

interface LinhaCotacao {
  id: number
  produto_id: string
  descricao: string
  preco_unitario: number
  quantidade: number
}

interface CotacaoPrintProps {
  empresa: Empresa
  cliente: Cliente | null
  numeroCotacao: string
  dataCotacao: string
  dataValidade: string
  linhas: LinhaCotacao[]
  subtotal: number
  iva: number
  total: number
  diretorGeral?: string
  notas?: string | null // Adicionei esta prop
  onClose: () => void
}

export function CotacaoPrint({
  empresa,
  cliente,
  numeroCotacao: initialNumeroCotacao,
  dataCotacao: initialDataCotacao,
  dataValidade: initialDataValidade,
  linhas: initialLinhas,
  subtotal: initialSubtotal,
  iva: initialIva,
  total: initialTotal,
  diretorGeral = "Ramos Siquice",
  notas, // Adicionei as notas
  onClose,
}: CotacaoPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const [numeroCotacao, setNumeroCotacao] = useState(initialNumeroCotacao)
  const [dataCotacao, setDataCotacao] = useState(initialDataCotacao)
  const [dataValidade, setDataValidade] = useState(initialDataValidade)
  const [linhas, setLinhas] = useState(initialLinhas)
  const [clienteNome, setClienteNome] = useState(cliente?.nome || "")
  const [clienteEndereco, setClienteEndereco] = useState(cliente?.endereco || "")
  const [clienteTelefone, setClienteTelefone] = useState(cliente?.telefone || "")
  const [clienteNuit, setClienteNuit] = useState(cliente?.nuit || "")
  const [diretorGeralNome, setDiretorGeralNome] = useState(diretorGeral)

  // Recalcular totais quando linhas mudam
  const subtotal = linhas.reduce((acc, linha) => acc + linha.preco_unitario * linha.quantidade, 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Converter número para extenso em português
  const numeroParaExtenso = (valor: number): string => {
    const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"]
    const especiais = [
      "Dez",
      "Onze",
      "Doze",
      "Treze",
      "Catorze",
      "Quinze",
      "Dezasseis",
      "Dezassete",
      "Dezoito",
      "Dezanove",
    ]
    const dezenas = ["", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"]
    const centenas = [
      "",
      "Cento",
      "Duzentos",
      "Trezentos",
      "Quatrocentos",
      "Quinhentos",
      "Seiscentos",
      "Setecentos",
      "Oitocentos",
      "Novecentos",
    ]

    const converterGrupo = (n: number): string => {
      if (n === 0) return ""
      if (n === 100) return "Cem"

      let resultado = ""
      const c = Math.floor(n / 100)
      const d = Math.floor((n % 100) / 10)
      const u = n % 10

      if (c > 0) resultado += centenas[c]

      if (n % 100 >= 10 && n % 100 <= 19) {
        if (resultado) resultado += " e "
        resultado += especiais[(n % 100) - 10]
        return resultado
      }

      if (d > 1) {
        if (resultado) resultado += " e "
        resultado += dezenas[d]
      }

      if (u > 0) {
        if (resultado) resultado += " e "
        resultado += unidades[u]
      }

      return resultado
    }

    const parteInteira = Math.floor(valor)
    const centavos = Math.round((valor - parteInteira) * 100)

    if (parteInteira === 0 && centavos === 0) return "Zero Meticais"

    let resultado = ""

    const milhoes = Math.floor(parteInteira / 1000000)
    const milhares = Math.floor((parteInteira % 1000000) / 1000)
    const resto = parteInteira % 1000

    if (milhoes > 0) {
      resultado += converterGrupo(milhoes) + (milhoes === 1 ? " Milhão" : " Milhões")
    }

    if (milhares > 0) {
      if (resultado) resultado += ", "
      if (milhares === 1) {
        resultado += "Mil"
      } else {
        resultado += converterGrupo(milhares) + " Mil"
      }
    }

    if (resto > 0) {
      if (resultado) resultado += resto < 100 ? " e " : ", "
      resultado += converterGrupo(resto)
    }

    resultado += parteInteira === 1 ? " Metical" : " Meticais"

    if (centavos > 0) {
      resultado += " e " + converterGrupo(centavos) + (centavos === 1 ? " Centavo" : " Centavos")
    }

    return resultado
  }

  const handlePrint = () => {
    window.print()
  }

  const calcularValidadeDias = () => {
    if (!dataCotacao || !dataValidade) return "05 Dias"
    const inicio = new Date(dataCotacao)
    const fim = new Date(dataValidade)
    const diff = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    return `${String(diff).padStart(2, "0")} Dias`
  }

  const adicionarLinha = () => {
    setLinhas([
      ...linhas,
      {
        id: Date.now(),
        produto_id: "",
        descricao: "",
        preco_unitario: 0,
        quantidade: 1,
      },
    ])
  }

  const removerLinha = (id: number) => {
    setLinhas(linhas.filter((linha) => linha.id !== id))
  }

  const atualizarLinha = (id: number, campo: keyof LinhaCotacao, valor: any) => {
    setLinhas(
      linhas.map((linha) =>
        linha.id === id
          ? { ...linha, [campo]: campo === "descricao" || campo === "produto_id" ? valor : Number(valor) }
          : linha,
      ),
    )
  }

  // Adicionar campo para editar o nome do Diretor Geral
  const handleDiretorGeralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDiretorGeralNome(e.target.value)
  }

  // Função para dividir as notas em linhas
  const obterLinhasDeNotas = () => {
    if (!notas || notas.trim() === "") {
      return [{ id: 1, conteudo: "Nenhuma nota adicionada." }]
    }
    
    // Dividir por quebras de linha e filtrar linhas vazias
    const linhasNotas = notas.split('\n').filter(linha => linha.trim() !== '')
    
    // Se não houver linhas, retornar uma linha padrão
    if (linhasNotas.length === 0) {
      return [{ id: 1, conteudo: "Nenhuma nota adicionada." }]
    }
    
    // Retornar linhas com IDs
    return linhasNotas.map((conteudo, index) => ({
      id: index + 1,
      conteudo: conteudo.trim()
    }))
  }

  const linhasNotas = obterLinhasDeNotas()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        {/* Modal Header - Only visible on screen */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between print:hidden z-10">
          <h2 className="text-lg font-semibold">Pré-visualização da Cotação (Clique para editar)</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#3b5998] text-white rounded-lg hover:bg-[#2d4373] transition-colors"
            >
              Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Print Content - Exact replica of the Magic Pro Services quotation */}
        <div ref={printRef} className="p-8 print:p-0 bg-white" id="cotacao-print">
          {/* ===== HEADER ===== */}
          <div className="flex justify-between items-start mb-2">
            {/* Left: Logo + Company Name */}
            <div className="flex items-center gap-3">
              {/* Logo */}
              <Image
                src="/images/magic-pro-logo.png"
                alt="Magic Pro Services"
                width={55}
                height={55}
                className="object-contain"
              />
              <div>
                <h1 className="text-[#1a3a5c] text-xl font-bold tracking-wide uppercase">MAGIC PRO SERVICES</h1>
                <p className="text-[#1a3a5c] text-[10px] italic">A Sua sastifação é o Nosso Objectivo</p>
              </div>
            </div>

            {/* Right: Cotação title */}
            <div>
              <h2 className="text-[#4a6fa5] text-3xl font-serif italic border-b-2 border-[#3b5998] pb-1">Cotação</h2>
            </div>
          </div>

          {/* ===== COMPANY INFO + DOCUMENT INFO ===== */}
          <div className="flex justify-between mb-4 text-[11px]">
            {/* Left: Company Details */}
            <div className="text-[#1a3a5c] leading-relaxed">
              <p className="font-bold">Magic Pro Services</p>
              <p>Av: FPLM, Nº 1710, R/C-2</p>
              <p>Cidade: Maputo - Cidade</p>
              <p>Tel: 86 73 400 18 / 82 73 40 017</p>
              <p className="mt-1">Email: Info@magicproservices.com / Rlsiquice@magicproservices.com</p>
            </div>

            {/* Right: Document Info - Editável */}
            <div className="text-[#1a3a5c] text-[11px]">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">Data:</span>
                <input
                  type="date"
                  value={dataCotacao}
                  onChange={(e) => setDataCotacao(e.target.value)}
                  className="border-b border-gray-400 bg-transparent text-center print:border-gray-400 focus:outline-none focus:ring-0 focus:border-[#3b5998] px-1 ml-2"
                />
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">Cotação Nº</span>
                <input
                  type="text"
                  value={numeroCotacao}
                  onChange={(e) => setNumeroCotacao(e.target.value)}
                  className="w-20 border-b border-gray-400 bg-transparent text-center print:border-gray-400 focus:outline-none focus:ring-0 focus:border-[#3b5998] px-1 ml-2"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Validade :</span>
                <span className="ml-2">{calcularValidadeDias()}</span>
              </div>
            </div>
          </div>

          {/* ===== COTAÇÃO PARA (CLIENT SECTION) - Editável ===== */}
          <div className="border border-[#3b5998] mb-4">
            {/* Blue header */}
            <div className="bg-[#3b5998] text-white px-3 py-1 text-[11px] font-semibold text-center">Cotação Para:</div>
            {/* Client details */}
            <div className="p-3 text-[11px] space-y-1">
              <div className="flex items-baseline">
                <span className="font-semibold w-20 text-[#1a3a5c] italic">Empresa:</span>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="flex-1 border-b border-gray-400 bg-transparent text-gray-700 italic ml-1 focus:outline-none focus:border-[#3b5998] print:border-gray-400"
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="flex items-baseline">
                <span className="font-semibold w-20 text-[#1a3a5c] italic">Endereço:</span>
                <input
                  type="text"
                  value={clienteEndereco}
                  onChange={(e) => setClienteEndereco(e.target.value)}
                  className="flex-1 border-b border-gray-400 bg-transparent text-gray-700 italic ml-1 focus:outline-none focus:border-[#3b5998] print:border-gray-400"
                  placeholder="Endereço"
                />
              </div>
              <div className="flex items-baseline">
                <span className="font-semibold w-20 text-[#1a3a5c] italic">Tel:</span>
                <input
                  type="text"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  className="flex-1 border-b border-gray-400 bg-transparent text-gray-700 ml-1 focus:outline-none focus:border-[#3b5998] print:border-gray-400"
                  placeholder="Telefone"
                />
              </div>
              <div className="flex items-baseline">
                <span className="font-semibold w-20 text-[#1a3a5c] italic">Nuit:</span>
                <input
                  type="text"
                  value={clienteNuit}
                  onChange={(e) => setClienteNuit(e.target.value)}
                  className="flex-1 border-b border-gray-400 bg-transparent text-gray-700 ml-1 focus:outline-none focus:border-[#3b5998] print:border-gray-400"
                  placeholder="NUIT"
                />
              </div>
            </div>
          </div>

          {/* ===== ITEMS TABLE - Editável ===== */}
          <table className="w-full border-collapse text-[11px] mb-2">
            <thead>
              <tr>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] w-12 bg-white">
                  Item
                </th>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] bg-white">
                  Descrição
                </th>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] w-12 bg-white">
                  Qtd.
                </th>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] w-20 bg-white">
                  P. Unit
                </th>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] w-24 bg-white">
                  P. Total
                </th>
                <th className="border border-[#3b5998] px-2 py-1.5 text-center font-semibold text-[#1a3a5c] w-8 bg-white print:hidden">
                  Acções
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-[#3b5998] px-2 py-4 text-center text-gray-400">
                    Nenhum item adicionado
                  </td>
                </tr>
              ) : (
                linhas.map((linha, index) => (
                  <tr key={linha.id}>
                    <td className="border border-[#3b5998] px-2 py-1 text-center">{index + 1}</td>
                    <td className="border border-[#3b5998] px-2 py-1">
                      <input
                        type="text"
                        value={linha.descricao}
                        onChange={(e) => atualizarLinha(linha.id, "descricao", e.target.value)}
                        className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-[#3b5998] rounded px-1 print:ring-0"
                        placeholder="Descrição do produto"
                      />
                    </td>
                    <td className="border border-[#3b5998] px-2 py-1 text-center">
                      <input
                        type="number"
                        value={linha.quantidade}
                        onChange={(e) => atualizarLinha(linha.id, "quantidade", e.target.value)}
                        className="w-full text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-[#3b5998] rounded px-1 print:ring-0"
                        min="1"
                      />
                    </td>
                    <td className="border border-[#3b5998] px-2 py-1 text-right">
                      <input
                        type="number"
                        value={linha.preco_unitario}
                        onChange={(e) => atualizarLinha(linha.id, "preco_unitario", e.target.value)}
                        className="w-full text-right bg-transparent focus:outline-none focus:ring-1 focus:ring-[#3b5998] rounded px-1 print:ring-0"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="border border-[#3b5998] px-2 py-1 text-right">
                      {formatCurrency(linha.preco_unitario * linha.quantidade)}
                    </td>
                    <td className="border border-[#3b5998] px-2 py-1 text-center print:hidden">
                      <button
                        onClick={() => removerLinha(linha.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remover linha"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
              <tr className="print:hidden">
                <td colSpan={6} className="border border-[#3b5998] px-2 py-2 text-center">
                  <button
                    onClick={adicionarLinha}
                    className="text-[#3b5998] hover:text-[#2d4373] text-sm font-semibold"
                  >
                    + Adicionar Item
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== TOTALS with dotted lines ===== */}
          <div className="text-[11px] mb-2 space-y-0.5">
            <div className="flex items-baseline">
              <span className="font-semibold text-[#1a3a5c]">Sub -Total</span>
              <span className="flex-1 border-b border-dotted border-gray-400 mx-2"></span>
              <span className="w-12 text-right">MZN</span>
              <span className="w-24 text-right font-mono">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-semibold text-[#1a3a5c]">IVA 16%</span>
              <span className="flex-1 border-b border-dotted border-gray-400 mx-2"></span>
              <span className="w-12 text-right">MZN</span>
              <span className="w-24 text-right font-mono">{formatCurrency(iva)}</span>
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-[#1a3a5c]">Total</span>
              <span className="flex-1 border-b border-dotted border-gray-400 mx-2"></span>
              <span className="w-12 text-right">MZN</span>
              <span className="w-24 text-right font-mono font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* ===== AMOUNT IN WORDS ===== */}
          <div className="text-[11px] mb-4">
            <span className="font-semibold text-[#1a3a5c]">São: </span>
            <span>{numeroParaExtenso(total)}.</span>
          </div>

          {/* ===== FOOTER - BANK DETAILS + TERMS ===== */}
          <div className="flex text-[9px] mb-4">
            {/* Left: Bank Details */}
            <div className="flex-1 border border-[#3b5998]">
              <div className="bg-[#3b5998] text-white px-2 py-1 font-semibold text-center">Dados Bancários</div>
              <div className="p-2 text-[#1a3a5c] space-y-0.5">
                <p>MOZA BANCO: 3903555910001 ;NIB: 003400003903555910165</p>
                <p>ABSA: 0007102004618; NIB: 000200070710200461876</p>
              </div>
            </div>

            {/* Right: Terms */}
            <div className="flex-1 border border-[#3b5998] border-l-0">
              <div className="bg-[#3b5998] text-white px-2 py-1 font-semibold text-center">
                Garantia Técnica - 1 (Um) Ano.
              </div>
              <div className="p-2 text-[#1a3a5c] space-y-0.5">
                <p>
                  <span className="font-semibold">Prazo de Entrega -</span> Imediata, após confirmação da Ordem
                </p>
                <p>
                  <span className="font-semibold">Condições de Fornecimento:</span> Por Negociar.
                </p>
              </div>
            </div>
          </div>

          {/* ===== TABELA DE NOTAS (Agora recebendo do CotacoesClient) ===== */}
          <div className="border border-[#3b5998] mb-4">
            <div className="bg-[#3b5998] text-white px-3 py-1 text-[11px] font-semibold text-center">NOTA</div>
            <div className="p-2">
              <table className="w-full border-collapse text-[10px]">
                <tbody>
                  {linhasNotas.map((nota, index) => (
                    <tr key={nota.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="border border-[#3b5998] px-2 py-1 align-top w-8 text-center">
                        {nota.id}
                      </td>
                      <td className="border border-[#3b5998] px-2 py-1 whitespace-pre-wrap">
                        {nota.conteudo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== SIGNATURE SECTION com campo editável para Diretor Geral ===== */}
          <div className="flex justify-end items-end mt-8">
            {/* Right: Signature line */}
            <div className="text-center">
              <div className="w-48 border-b border-[#1a3a5c] mb-1"></div>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  value={diretorGeralNome}
                  onChange={handleDiretorGeralChange}
                  className="text-[10px] text-[#1a3a5c] bg-transparent border-b border-gray-400 focus:outline-none focus:border-[#1a3a5c] text-center print:border-gray-400"
                  style={{ width: `${Math.max(diretorGeralNome.length * 8, 100)}px` }}
                />
                <span className="text-[10px] text-[#1a3a5c]">- Director Geral</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cotacao-print, #cotacao-print * {
            visibility: visible;
          }
          #cotacao-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm 15mm;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Preservar cores na impressão */
          #cotacao-print * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Preservar fundos coloridos */
          .bg-white {
            background-color: white !important;
          }
          .bg-[#3b5998] {
            background-color: #3b5998 !important;
          }
          .bg-gray-50 {
            background-color: #f9fafb !important;
          }
          /* Preservar cores de texto */
          .text-[#1a3a5c] {
            color: #1a3a5c !important;
          }
          .text-[#3b5998] {
            color: #3b5998 !important;
          }
          .text-[#4a6fa5] {
            color: #4a6fa5 !important;
          }
          .text-white {
            color: white !important;
          }
          /* Preservar cores de bordas */
          .border-[#3b5998] {
            border-color: #3b5998 !important;
          }
          .border-[#1a3a5c] {
            border-color: #1a3a5c !important;
          }
          @page {
            size: A4;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  )
}
