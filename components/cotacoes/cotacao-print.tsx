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
  notas?: string | null
  onClose: () => void
}

export function CotacaoPrint({
  empresa,
  cliente,
  numeroCotacao: initialNumeroCotacao,
  dataCotacao: initialDataCotacao,
  dataValidade: initialDataValidade,
  linhas: initialLinhas,
  diretorGeral = "Ramos Siquice",
  notas,
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
  const [objecto, setObjecto] = useState("")
  const [localidade, setLocalidade] = useState("Maputo")

  // Recalcular totais
  const subtotal = linhas.reduce((acc, l) => acc + l.preco_unitario * l.quantidade, 0)
  const iva = subtotal * 0.16
  const total = subtotal + iva

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "long", year: "numeric" })
  }

  const calcularValidadeDias = () => {
    if (!dataCotacao || !dataValidade) return "05 Dias"
    const inicio = new Date(dataCotacao)
    const fim = new Date(dataValidade)
    const diff = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
    return `${String(diff).padStart(2, "0")} Dias`
  }

  // Número por extenso
  const numeroParaExtenso = (valor: number): string => {
    const unidades = ["", "Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"]
    const especiais = ["Dez", "Onze", "Doze", "Treze", "Catorze", "Quinze", "Dezasseis", "Dezassete", "Dezoito", "Dezanove"]
    const dezenas = ["", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"]
    const centenas = ["", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos", "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"]

    const converterGrupo = (n: number): string => {
      if (n === 0) return ""
      if (n === 100) return "Cem"
      let res = ""
      const c = Math.floor(n / 100)
      const d = Math.floor((n % 100) / 10)
      const u = n % 10
      if (c > 0) res += centenas[c]
      if (n % 100 >= 10 && n % 100 <= 19) {
        if (res) res += " e "
        res += especiais[(n % 100) - 10]
        return res
      }
      if (d > 1) { if (res) res += " e "; res += dezenas[d] }
      if (u > 0) { if (res) res += " e "; res += unidades[u] }
      return res
    }

    const parteInteira = Math.floor(valor)
    const centavos = Math.round((valor - parteInteira) * 100)
    if (parteInteira === 0 && centavos === 0) return "Zero Meticais"
    let res = ""
    const milhoes = Math.floor(parteInteira / 1000000)
    const milhares = Math.floor((parteInteira % 1000000) / 1000)
    const resto = parteInteira % 1000
    if (milhoes > 0) res += converterGrupo(milhoes) + (milhoes === 1 ? " Milhão" : " Milhões")
    if (milhares > 0) {
      if (res) res += ", "
      res += milhares === 1 ? "Mil" : converterGrupo(milhares) + " Mil"
    }
    if (resto > 0) { if (res) res += resto < 100 ? " e " : ", "; res += converterGrupo(resto) }
    res += parteInteira === 1 ? " Metical" : " Meticais"
    if (centavos > 0) res += " e " + converterGrupo(centavos) + (centavos === 1 ? " Centavo" : " Centavos")
    return res
  }

  const adicionarLinha = () =>
    setLinhas([...linhas, { id: Date.now(), produto_id: "", descricao: "", preco_unitario: 0, quantidade: 1 }])

  const removerLinha = (id: number) => setLinhas(linhas.filter((l) => l.id !== id))

  const atualizarLinha = (id: number, campo: keyof LinhaCotacao, valor: any) =>
    setLinhas(linhas.map((l) =>
      l.id === id ? { ...l, [campo]: campo === "descricao" || campo === "produto_id" ? valor : Number(valor) } : l
    ))

  const obterLinhasDeNotas = () => {
    if (!notas || notas.trim() === "") return [{ id: 1, conteudo: "Nenhuma nota adicionada." }]
    const ls = notas.split("\n").filter((l) => l.trim() !== "")
    if (ls.length === 0) return [{ id: 1, conteudo: "Nenhuma nota adicionada." }]
    return ls.map((conteudo, i) => ({ id: i + 1, conteudo: conteudo.trim() }))
  }
  const linhasNotas = obterLinhasDeNotas()

  // Preencher linhas vazias até mínimo de 5 para visual da tabela
  const LINHAS_MIN = 5
  const linhasVazias = Math.max(0, LINHAS_MIN - linhas.length)

  const s: Record<string, React.CSSProperties> = {
    page: {
      background: "white",
      width: "210mm",
      minHeight: "297mm",
      padding: "15mm",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#000",
      boxSizing: "border-box",
    },
    // ── Header ──
    header: { display: "flex", justifyContent: "space-between", marginBottom: "10px" },
    companyBox: {
      border: "1.5px solid #000",
      borderRadius: "15px",
      padding: "15px",
      width: "48%",
      fontSize: "11px",
      lineHeight: "1.3",
    },
    logoArea: { display: "flex", alignItems: "center", marginBottom: "6px" },
    logoText: { fontSize: "18px", fontWeight: "bold", color: "#1a3a5c", marginLeft: "8px", letterSpacing: "-0.5px", textTransform: "uppercase" },
    companySubtitle: { fontSize: "9px", color: "#333", marginBottom: "4px", fontStyle: "italic" },
    companyServices: { fontSize: "10px", color: "#004b87", marginBottom: "4px" },
    rightHeader: { width: "48%", display: "flex", flexDirection: "column", justifyContent: "space-between" },
    docTitleBox: {
      border: "1.5px solid #000",
      borderRadius: "10px",
      padding: "10px",
      textAlign: "center",
      fontSize: "16px",
      fontWeight: "bold",
    },
    clientBox: {
      border: "1.5px solid #000",
      borderRadius: "15px",
      padding: "12px",
      fontSize: "11px",
      lineHeight: "1.6",
      flexGrow: 1,
      marginTop: "10px",
    },
    // ── Divider ──
    divider: {
      borderTop: "1.5px solid #000",
      borderBottom: "1.5px solid #000",
      height: "4px",
      margin: "10px 0",
    },
    // ── Pre-table ──
    preTableInfo: { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px", fontWeight: "bold" },
    // ── Table ──
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "11px", marginBottom: "10px" },
    th: { border: "1px solid #000", padding: "4px 6px", backgroundColor: "#e6f0fa", fontWeight: "bold", textAlign: "center" as const },
    td: { border: "1px solid #000", padding: "4px 6px" },
    tdCenter: { border: "1px solid #000", padding: "4px 6px", textAlign: "center" as const },
    tdRight: { border: "1px solid #000", padding: "4px 6px", textAlign: "right" as const },
    // ── Summary ──
    summaryArea: { display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "flex-start" },
    taxReason: {
      border: "1.5px solid #000",
      width: "55%",
      padding: "8px",
      fontSize: "11px",
      minHeight: "50px",
    },
    totalsTable: { width: "40%", borderCollapse: "collapse" as const },
    totalsTableTd: { border: "1.5px solid #000", padding: "4px 8px", fontSize: "11px", fontWeight: "bold" },
    // ── Footer details ──
    footerDetails: { display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "flex-start" },
    bankBoxes: { display: "flex", gap: "10px", width: "60%" },
    bankBox: {
      border: "1.5px solid #000",
      borderRadius: "15px",
      padding: "10px",
      fontSize: "10px",
      lineHeight: "1.4",
      width: "50%",
    },
    signatureBox: {
      width: "35%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: "30px",
    },
    sigLine: { width: "100%", borderBottom: "1px dotted #000", marginBottom: "5px" },
    // ── Bottom footer ──
    systemInfo: {
      display: "flex",
      justifyContent: "space-between",
      borderTop: "1.5px solid #000",
      borderBottom: "1.5px solid #000",
      padding: "3px 0",
      marginBottom: "8px",
      fontSize: "11px",
    },
    editInput: {
      background: "transparent",
      border: "none",
      borderBottom: "1px dashed #999",
      outline: "none",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#000",
      width: "100%",
    },
    editInputCenter: {
      background: "transparent",
      border: "none",
      borderBottom: "1px dashed #999",
      outline: "none",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#000",
      textAlign: "center" as const,
      width: "100%",
    },
    editInputRight: {
      background: "transparent",
      border: "none",
      borderBottom: "1px dashed #999",
      outline: "none",
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#000",
      textAlign: "right" as const,
      width: "100%",
    },
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full">

        {/* ── Toolbar (screen only) ── */}
        <div className="sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between print:hidden z-10">
          <h2 className="text-base font-semibold text-gray-700">Pré-visualização — Clique nos campos para editar</h2>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#1a3a5c] text-white rounded hover:bg-[#2d4373] text-sm transition-colors"
            >
              Imprimir / PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 transition-colors">
              Fechar
            </button>
          </div>
        </div>

        {/* ── Printable area ── */}
        <div ref={printRef} style={s.page} id="cotacao-print">

          {/* ════ 1. HEADER ════ */}
          <div style={s.header}>
            {/* Left: Company box */}
            <div style={s.companyBox}>
              <div style={s.logoArea}>
                <Image src="/images/magic-pro-logo.png" alt="Magic Pro Services" width={48} height={48} style={{ objectFit: "contain" }} />
                <div style={s.logoText}>Magic Pro Services</div>
              </div>
              <div style={s.companySubtitle}>A Sua Satisfação é o Nosso Objectivo</div>
              <div style={s.companyServices}>Serviços | Consultoria | Soluções</div>
              <div>Av: FPLM, Nº 1710, R/C-2 — Maputo</div>
              <div>Tel.: 86 73 400 18 / 82 73 400 17</div>
              <div>Email: info@magicproservices.com</div>
              <div>NUIT: {empresa?.nuit || "—"}</div>
            </div>

            {/* Right: Doc title + Client */}
            <div style={s.rightHeader}>
              <div style={s.docTitleBox}>
                <span style={{ color: "#d32f2f" }}>Cotação nº&nbsp;</span>
                <input
                  type="text"
                  value={numeroCotacao}
                  onChange={(e) => setNumeroCotacao(e.target.value)}
                  style={{ ...s.editInputCenter, width: "80px", display: "inline", fontWeight: "bold", fontSize: "16px" }}
                />
              </div>
              <div style={s.clientBox}>
                <div style={{ marginBottom: "3px" }}>
                  <span style={{ fontWeight: "bold" }}>Ex. Senhor(a): </span>
                  <input type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)}
                    style={{ ...s.editInput, width: "calc(100% - 100px)", display: "inline" }}
                    placeholder="Nome / Empresa" />
                </div>
                <div style={{ marginBottom: "3px" }}>
                  <span style={{ fontWeight: "bold" }}>Endereço: </span>
                  <input type="text" value={clienteEndereco} onChange={(e) => setClienteEndereco(e.target.value)}
                    style={{ ...s.editInput, width: "calc(100% - 70px)", display: "inline" }}
                    placeholder="Endereço" />
                </div>
                <div style={{ marginBottom: "3px" }}>
                  <span style={{ fontWeight: "bold" }}>NUIT: </span>
                  <input type="text" value={clienteNuit} onChange={(e) => setClienteNuit(e.target.value)}
                    style={{ ...s.editInput, width: "calc(100% - 45px)", display: "inline" }}
                    placeholder="NUIT" />
                </div>
                <div>
                  <span style={{ fontWeight: "bold" }}>Tel./Cel: </span>
                  <input type="text" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)}
                    style={{ ...s.editInput, width: "calc(100% - 65px)", display: "inline" }}
                    placeholder="Telefone" />
                </div>
              </div>
            </div>
          </div>

          {/* ════ 2. DOUBLE DIVIDER ════ */}
          <div style={s.divider} />

          {/* ════ 3. PRE-TABLE INFO ════ */}
          <div style={s.preTableInfo}>
            <div>
              <span style={{ color: "#d32f2f", fontWeight: "normal" }}>Objecto:&nbsp;</span>
              <input type="text" value={objecto} onChange={(e) => setObjecto(e.target.value)}
                style={{ ...s.editInput, width: "250px", display: "inline", fontWeight: "normal" }}
                placeholder="Descrição do objecto..." />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="text" value={localidade} onChange={(e) => setLocalidade(e.target.value)}
                style={{ ...s.editInput, width: "80px", display: "inline" }} />
              <span>:</span>
              <input type="date" value={dataCotacao} onChange={(e) => setDataCotacao(e.target.value)}
                style={{ ...s.editInput, width: "130px", display: "inline" }} />
            </div>
          </div>

          {/* ════ 4. MAIN TABLE ════ */}
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: "5%" }}>Ord.</th>
                <th style={{ ...s.th, width: "55%", textAlign: "left" }}>Descrição</th>
                <th style={{ ...s.th, width: "8%" }}>Qy</th>
                <th style={{ ...s.th, width: "15%" }}>P.U</th>
                <th style={{ ...s.th, width: "17%" }}>Valor</th>
                <th style={{ ...s.th, width: "5%" }} className="print:hidden">—</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, index) => (
                <tr key={linha.id}>
                  <td style={s.tdCenter}>{index + 1}</td>
                  <td style={s.td}>
                    <input type="text" value={linha.descricao}
                      onChange={(e) => atualizarLinha(linha.id, "descricao", e.target.value)}
                      style={s.editInput} placeholder="Descrição..." />
                  </td>
                  <td style={s.tdCenter}>
                    <input type="number" value={linha.quantidade} min={1}
                      onChange={(e) => atualizarLinha(linha.id, "quantidade", e.target.value)}
                      style={s.editInputCenter} />
                  </td>
                  <td style={s.tdRight}>
                    <input type="number" value={linha.preco_unitario} min={0} step={0.01}
                      onChange={(e) => atualizarLinha(linha.id, "preco_unitario", e.target.value)}
                      style={s.editInputRight} />
                  </td>
                  <td style={s.tdRight}>{formatCurrency(linha.preco_unitario * linha.quantidade)}</td>
                  <td style={s.tdCenter} className="print:hidden">
                    <button onClick={() => removerLinha(linha.id)} style={{ color: "#c00", cursor: "pointer", fontWeight: "bold", fontSize: "14px", background: "none", border: "none" }} title="Remover">×</button>
                  </td>
                </tr>
              ))}

              {/* Linhas vazias para preenchimento visual */}
              {Array.from({ length: linhasVazias }).map((_, i) => (
                <tr key={`vazia-${i}`}>
                  <td style={s.tdCenter}>{linhas.length + i + 1}</td>
                  <td style={s.td}>&nbsp;</td>
                  <td style={s.tdCenter}></td>
                  <td style={s.tdRight}></td>
                  <td style={s.tdRight}>{i === linhasVazias - 1 ? "—" : ""}</td>
                  <td className="print:hidden" style={s.tdCenter}></td>
                </tr>
              ))}

              {/* Botão adicionar (screen only) */}
              <tr className="print:hidden">
                <td colSpan={6} style={{ ...s.td, textAlign: "center", padding: "6px" }}>
                  <button onClick={adicionarLinha}
                    style={{ color: "#1a3a5c", fontWeight: "bold", cursor: "pointer", background: "none", border: "none", fontSize: "12px" }}>
                    + Adicionar Linha
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ════ 5. SUMMARY AREA ════ */}
          <div style={s.summaryArea}>
            {/* Left: tax reason */}
            <div style={s.taxReason}>
              <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px" }}>Motivo da não aplicação do Imposto:</div>
              <div style={{ borderBottom: "1px solid #ccc", marginBottom: "4px" }}>&nbsp;</div>
              <div style={{ borderBottom: "1px solid #ccc" }}>&nbsp;</div>
            </div>

            {/* Right: totals */}
            <table style={s.totalsTable}>
              <tbody>
                <tr>
                  <td style={{ ...s.totalsTableTd, width: "45%" }}>Sub-total</td>
                  <td style={{ ...s.totalsTableTd, textAlign: "right" }}>{formatCurrency(subtotal)}</td>
                </tr>
                <tr>
                  <td style={s.totalsTableTd}>IVA 16%</td>
                  <td style={{ ...s.totalsTableTd, textAlign: "right" }}>{iva > 0 ? formatCurrency(iva) : "—"}</td>
                </tr>
                <tr>
                  <td style={{ ...s.totalsTableTd, fontSize: "12px" }}>Total</td>
                  <td style={{ ...s.totalsTableTd, textAlign: "right", fontSize: "12px" }}>{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Valor por extenso */}
          <div style={{ fontSize: "11px", fontStyle: "italic", marginBottom: "15px" }}>
            <strong>São: </strong>{numeroParaExtenso(total)}.
          </div>

          {/* ════ 6. FOOTER DETAILS ════ */}
          <div style={s.footerDetails}>
            {/* Bank boxes */}
            <div style={s.bankBoxes}>
              <div style={s.bankBox}>
                <strong style={{ fontSize: "11px", display: "block", marginBottom: "3px" }}>Dados Bancários</strong>
                MOZA BANCO<br />
                Nº da Conta: 3903555910001<br />
                NIB: 003400003903555910165<br />
                Titular: <strong>Magic Pro Services</strong>
              </div>
              <div style={s.bankBox}>
                <strong style={{ fontSize: "11px", display: "block", marginBottom: "3px" }}>Dados Bancários</strong>
                ABSA<br />
                Nº da Conta: 0007102004618<br />
                NIB: 000200070710200461876<br />
                Validade: <strong>{calcularValidadeDias()}</strong>
              </div>
            </div>

            {/* Signature */}
            <div style={s.signatureBox}>
              <div style={s.sigLine} />
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                <input
                  type="text"
                  value={diretorGeralNome}
                  onChange={(e) => setDiretorGeralNome(e.target.value)}
                  style={{ ...s.editInputCenter, width: `${Math.max(diretorGeralNome.length * 7, 100)}px` }}
                />
                <span>— Director Geral</span>
              </div>
            </div>
          </div>

          {/* ════ 7. NOTAS ════ */}
          {linhasNotas.length > 0 && (
            <div style={{ border: "1.5px solid #000", marginBottom: "15px" }}>
              <div style={{ background: "#e6f0fa", fontWeight: "bold", padding: "4px 8px", borderBottom: "1px solid #000", fontSize: "11px", textAlign: "center" }}>
                NOTA
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <tbody>
                  {linhasNotas.map((nota, index) => (
                    <tr key={nota.id} style={{ background: index % 2 === 0 ? "#f9f9f9" : "white" }}>
                      <td style={{ ...s.td, width: "32px", textAlign: "center", verticalAlign: "top" }}>{nota.id}</td>
                      <td style={{ ...s.td, whiteSpace: "pre-wrap" }}>{nota.conteudo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ════ 8. BOTTOM FOOTER ════ */}
          <div>
            <div style={{ fontSize: "9px", marginBottom: "2px" }}>NL</div>
            <div style={s.systemInfo}>
              <div>©Documento Processado pelo Computador</div>
              <div>{new Date().toLocaleDateString("pt-MZ")} {new Date().toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div style={{ fontSize: "8px", color: "#666" }}>
              Serviços | Consultoria | Soluções Técnicas — Magic Pro Services, Lda.
            </div>
          </div>

        </div>{/* end printable area */}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #cotacao-print, #cotacao-print * { visibility: visible; }
          #cotacao-print {
            position: absolute;
            left: 0; top: 0;
            width: 210mm;
            padding: 12mm 15mm;
            background: white;
          }
          .print\\:hidden { display: none !important; }
          #cotacao-print * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  )
}