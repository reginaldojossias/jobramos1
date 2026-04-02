"use client"

import { useRef, useState, useEffect } from "react"
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

  // Estados para edição
  const [numeroCotacao, setNumeroCotacao] = useState(initialNumeroCotacao)
  const [dataCotacao, setDataCotacao] = useState(initialDataCotacao)
  const [dataValidade, setDataValidade] = useState(initialDataValidade)
  const [linhas, setLinhas] = useState<LinhaCotacao[]>(initialLinhas)
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

  const calcularValidadeDias = () => {
    if (!dataCotacao || !dataValidade) return "05 Dias"
    const diff = Math.ceil((new Date(dataValidade).getTime() - new Date(dataCotacao).getTime()) / 86400000)
    return `${String(diff).padStart(2, "0")} Dias`
  }

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

  const atualizarLinha = (id: number, campo: keyof LinhaCotacao, valor: string | number) =>
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

  const LINHAS_MIN = 6
  const linhasVazias = Math.max(0, LINHAS_MIN - linhas.length)

  const inputBase: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px dashed #aaa",
    outline: "none",
    fontFamily: "Arial,sans-serif",
    fontSize: "13px",
    color: "#000",
    padding: "1px 2px",
  }

  // NOVA LÓGICA DE IMPRESSÃO PROFISSIONAL (ISOLADA DA PÁGINA)
  const handlePrint = () => {
    const printElement = document.getElementById("cotacao-print");
    if (!printElement) return;

    // Clona o elemento para não afetar o documento visível
    const clone = printElement.cloneNode(true) as HTMLElement;

    // Garante que os valores digitados (inputs) passam para o clone a imprimir
    const originalInputs = printElement.querySelectorAll("input, textarea");
    const clonedInputs = clone.querySelectorAll("input, textarea");
    originalInputs.forEach((input: any, index) => {
      if (clonedInputs[index]) {
        const clonedInput = clonedInputs[index] as any;
        clonedInput.setAttribute("value", input.value);
        if (input.tagName === "TEXTAREA") {
          clonedInput.innerHTML = input.value;
        }
      }
    });

    // Cria um iframe invisível para isolar completamente do Dashboard
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // Copia os estilos da página atual para não perder design e fontes
    const styleTags = document.querySelectorAll("style, link[rel='stylesheet']");
    let stylesHtml = "";
    styleTags.forEach((tag) => {
      stylesHtml += tag.outerHTML;
    });

    // Força regras A4 restritas apenas para este Iframe
    stylesHtml += `
      <style>
        @page { size: A4; margin: 0; }
        body {
          margin: 0;
          padding: 0;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #cotacao-print {
          width: 210mm !important;
          min-height: 297mm !important;
          margin: 0 auto !important;
          padding: 15mm !important;
          box-sizing: border-box !important;
          background: white !important;
        }
        .editavel {
          border: none !important;
          outline: none !important;
          background: transparent !important;
        }
        .no-print { display: none !important; }
      </style>
    `;

    // Escreve o documento no Iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Cotação - ${numeroCotacao}</title>
          ${stylesHtml}
        </head>
        <body>
          ${clone.outerHTML}
        </body>
      </html>
    `);
    iframeDoc.close();

    // Dispara a impressão a partir do iframe e depois remove-o da memória
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }

  return (
    <div className="cotacao-print-container">
      {/* Barra de ferramentas */}
      <div className="toolbar no-print">
        <span>Pré‑visualização — Clique nos campos para editar</span>
        <div>
          <button onClick={handlePrint}>🖨 Imprimir / PDF</button>
          <button onClick={onClose}>Fechar</button>
        </div>
      </div>

      {/* Documento único - visível em tela e impressão */}
      <div ref={printRef} id="cotacao-print" className="documento">
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
          <div style={{ border: "1.5px solid #000", borderRadius: "14px", padding: "14px 16px", width: "48%", lineHeight: "1.55" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Image
                src="/images/magic-pro-logo.png"
                alt="Logo"
                width={52}
                height={52}
                style={{ objectFit: "contain" }}
                unoptimized
              />
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1a3a5c", textTransform: "uppercase" }}>
                  Magic Pro Services
                </div>
                <div style={{ fontSize: "10px", fontStyle: "italic", color: "#555" }}>
                  A Sua Satisfação é o Nosso Objectivo
                </div>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#004b87", marginBottom: "3px" }}>
              Serviços | Consultoria | Soluções
            </div>
            <div>NUIT: {empresa?.nuit || "—"}</div>
            <div>Tel.: 86 73 400 18 / 82 73 400 17</div>
            <div>Email: info@magicproservices.com</div>
            <div>Av: FPLM, Nº 1710, R/C-2 — Maputo</div>
          </div>

          <div style={{ width: "48%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ border: "1.5px solid #000", borderRadius: "10px", padding: "11px", textAlign: "center" }}>
              <span style={{ color: "#d32f2f", fontSize: "17px", fontWeight: "bold" }}>Cotação nº&nbsp;</span>
              <input
                type="text"
                value={numeroCotacao}
                onChange={(e) => setNumeroCotacao(e.target.value)}
                className="editavel"
                style={{ ...inputBase, width: "80px", display: "inline", fontSize: "17px", fontWeight: "bold", textAlign: "center", borderBottom: "1.5px solid #d32f2f" }}
              />
            </div>
            <div style={{ border: "1.5px solid #000", borderRadius: "14px", padding: "12px 14px", lineHeight: "1.9", flexGrow: 1 }}>
              {[
                { label: "Ex. Senhor(a):", val: clienteNome, set: setClienteNome, ph: "Nome / Empresa", w: 112 },
                { label: "Endereço:", val: clienteEndereco, set: setClienteEndereco, ph: "Endereço", w: 80 },
                { label: "NUIT:", val: clienteNuit, set: setClienteNuit, ph: "NUIT", w: 50 },
                { label: "Tel./Cel:", val: clienteTelefone, set: setClienteTelefone, ph: "Telefone", w: 74 },
              ].map(({ label, val, set, ph, w }) => (
                <div key={label}>
                  <strong>{label}&nbsp;</strong>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="editavel"
                    style={{ ...inputBase, width: `calc(100% - ${w}px)`, display: "inline" }}
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", height: "5px", margin: "10px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "7px", fontWeight: "bold", alignItems: "center" }}>
          <div>
            <span style={{ color: "#d32f2f", fontWeight: "normal" }}>Objecto:&nbsp;</span>
            <input
              type="text"
              value={objecto}
              onChange={(e) => setObjecto(e.target.value)}
              className="editavel"
              style={{ ...inputBase, width: "250px", display: "inline", fontWeight: "normal" }}
              placeholder="Descrição do objecto..."
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="text"
              value={localidade}
              onChange={(e) => setLocalidade(e.target.value)}
              className="editavel"
              style={{ ...inputBase, width: "80px", display: "inline", textAlign: "right" }}
            />
            <span>:</span>
            <input
              type="date"
              value={dataCotacao}
              onChange={(e) => setDataCotacao(e.target.value)}
              className="editavel"
              style={{ ...inputBase, width: "140px", display: "inline" }}
            />
          </div>
        </div>

        {/* TABELA DE LINHAS */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "12px" }}>
          <thead>
            <tr>
              {[
                ["Ord.", "5%", "center"],
                ["Descrição", "56%", "left"],
                ["Qy", "8%", "center"],
                ["P.U", "14%", "right"],
                ["Valor", "17%", "right"],
              ].map(([h, w, a]) => (
                <th key={h} style={{ border: "1px solid #000", padding: "7px 6px", background: "#e6f0fa", textAlign: a as any, width: w, fontWeight: "bold" }}>
                  {h}
                </th>
              ))}
              <th style={{ border: "1px solid #000", padding: "7px 4px", background: "#e6f0fa", width: "4%" }} className="no-print">—</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, index) => (
              <tr key={linha.id} style={{ height: "30px" }}>
                <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "center" }}>{index + 1}</td>
                <td style={{ border: "1px solid #000", padding: "5px 6px" }}>
                  <input
                    type="text"
                    value={linha.descricao}
                    onChange={(e) => atualizarLinha(linha.id, "descricao", e.target.value)}
                    className="editavel"
                    style={{ ...inputBase, borderBottom: "none", width: "100%" }}
                    placeholder="Descrição..."
                  />
                </td>
                <td style={{ border: "1px solid #000", padding: "5px 6px" }}>
                  <input
                    type="number"
                    value={linha.quantidade}
                    min={1}
                    onChange={(e) => atualizarLinha(linha.id, "quantidade", e.target.value)}
                    className="editavel"
                    style={{ ...inputBase, textAlign: "center", borderBottom: "none", width: "100%" }}
                  />
                </td>
                <td style={{ border: "1px solid #000", padding: "5px 6px" }}>
                  <input
                    type="number"
                    value={linha.preco_unitario}
                    min={0}
                    step={0.01}
                    onChange={(e) => atualizarLinha(linha.id, "preco_unitario", e.target.value)}
                    className="editavel"
                    style={{ ...inputBase, textAlign: "right", borderBottom: "none", width: "100%" }}
                  />
                </td>
                <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right", fontWeight: "bold" }}>
                  {linha.preco_unitario > 0 ? formatCurrency(linha.preco_unitario * linha.quantidade) : ""}
                </td>
                <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "center" }} className="no-print">
                  <button
                    onClick={() => removerLinha(linha.id)}
                    style={{ color: "#c00", cursor: "pointer", fontWeight: "bold", fontSize: "18px", background: "none", border: "none", lineHeight: 1 }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}

            {Array.from({ length: linhasVazias }).map((_, i) => (
              <tr key={`v-${i}`} style={{ height: "30px" }}>
                <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "center" }}>{linhas.length + i + 1}</td>
                <td style={{ border: "1px solid #000" }}>&nbsp;</td>
                <td style={{ border: "1px solid #000" }}></td>
                <td style={{ border: "1px solid #000" }}></td>
                <td style={{ border: "1px solid #000", padding: "5px 6px", textAlign: "right" }}>{i === linhasVazias - 1 ? "—" : ""}</td>
                <td style={{ border: "1px solid #000" }} className="no-print"></td>
              </tr>
            ))}

            <tr className="no-print">
              <td colSpan={6} style={{ border: "1px solid #000", padding: "8px", textAlign: "center" }}>
                <button
                  onClick={adicionarLinha}
                  style={{ color: "#1a3a5c", fontWeight: "bold", cursor: "pointer", background: "none", border: "none", fontSize: "13px" }}
                >
                  + Adicionar Linha
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* TOTAIS */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "flex-start", gap: "16px" }}>
          <div style={{ border: "1.5px solid #000", width: "55%", padding: "10px", fontSize: "12px", minHeight: "60px" }}>
            <div style={{ color: "#444", marginBottom: "8px" }}>Motivo da não aplicação do Imposto:</div>
            <div style={{ borderBottom: "1px solid #ccc", marginBottom: "8px" }} />
            <div style={{ borderBottom: "1px solid #ccc" }} />
          </div>
          <table style={{ width: "42%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                { label: "Sub-total", val: formatCurrency(subtotal), bold: false },
                { label: "IVA 16%", val: iva > 0 ? formatCurrency(iva) : "—", bold: false },
                { label: "Total", val: formatCurrency(total), bold: true },
              ].map(({ label, val, bold }) => (
                <tr key={label}>
                  <td style={{ border: "1.5px solid #000", padding: "7px 10px", fontWeight: "bold", fontSize: bold ? "14px" : "13px", width: "44%" }}>
                    {label}
                  </td>
                  <td style={{ border: "1.5px solid #000", padding: "7px 10px", textAlign: "right", fontWeight: "bold", fontSize: bold ? "14px" : "13px" }}>
                    {val}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* VALOR POR EXTENSO */}
        <div style={{ fontSize: "12px", fontStyle: "italic", marginBottom: "18px" }}>
          <strong>São:&nbsp;</strong>{numeroParaExtenso(total)}.
        </div>

        {/* DADOS BANCÁRIOS */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "18px", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "12px", width: "60%" }}>
            {[
              { nome: "MOZA BANCO", conta: "3903555910001", nib: "003400003903555910165", extra: <><strong>Titular:</strong> Magic Pro Services</> },
              { nome: "ABSA", conta: "0007102004618", nib: "000200070710200461876", extra: <><strong>Validade:</strong> {calcularValidadeDias()}</> },
            ].map((b) => (
              <div key={b.nome} style={{ border: "1.5px solid #000", borderRadius: "14px", padding: "12px", fontSize: "12px", lineHeight: "1.65", width: "50%" }}>
                <strong style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Dados Bancários</strong>
                {b.nome}<br />
                Nº da Conta: {b.conta}<br />
                NIB: {b.nib}<br />
                {b.extra}
              </div>
            ))}
          </div>
          <div style={{ width: "35%", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "32px" }}>
            <div style={{ width: "100%", borderBottom: "1px dotted #000", marginBottom: "7px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
              <input
                type="text"
                value={diretorGeralNome}
                onChange={(e) => setDiretorGeralNome(e.target.value)}
                className="editavel"
                style={{ ...inputBase, width: `${Math.max(diretorGeralNome.length * 8, 100)}px`, display: "inline", fontSize: "12px" }}
              />
              <span>— Director Geral</span>
            </div>
          </div>
        </div>

        {/* NOTAS */}
        <div style={{ border: "1.5px solid #000", marginBottom: "16px" }}>
          <div style={{ background: "#e6f0fa", fontWeight: "bold", padding: "5px 10px", borderBottom: "1px solid #000", fontSize: "13px", textAlign: "center" }}>
            NOTA
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {linhasNotas.map((nota, i) => (
                <tr key={nota.id} style={{ background: i % 2 === 0 ? "#f7f7f7" : "white" }}>
                  <td style={{ border: "1px solid #ccc", padding: "5px 8px", width: "36px", textAlign: "center", verticalAlign: "top" }}>
                    {nota.id}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "5px 8px", whiteSpace: "pre-wrap" }}>{nota.conteudo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RODAPÉ */}
        <div>
          <div style={{ fontSize: "9px", marginBottom: "2px" }}>NL</div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "4px 0", marginBottom: "8px", fontSize: "12px" }}>
            <span>©Documento Processado pelo Computador</span>
            <span>{new Date().toLocaleDateString("pt-MZ")} {new Date().toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div style={{ fontSize: "9px", color: "#555" }}>Serviços | Consultoria | Soluções Técnicas — Magic Pro Services, Lda.</div>
        </div>
      </div>

      <style jsx global>{`
        /* ESTES ESTILOS AGORA SÓ AFETAM A VISUALIZAÇÃO NO ECRÃ */
        .cotacao-print-container {
          position: fixed;
          inset: 0;
          background: #6b7280;
          overflow: auto;
          z-index: 9999;
        }
        .toolbar {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 4px rgba(0,0,0,.12);
          z-index: 10;
        }
        .toolbar span {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .toolbar button:first-child {
          padding: 8px 20px;
          background: #1a3a5c;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          margin-right: 8px;
        }
        .toolbar button:last-child {
          padding: 8px 16px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }
        .documento {
          font-family: Arial,sans-serif;
          font-size: 13px;
          color: #000;
          background: white;
          width: 210mm;
          min-height: 297mm;
          padding: 14mm 15mm;
          box-sizing: border-box;
          margin: 68px auto 40px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
        }
        .editavel {
          background: transparent;
          border: none;
          outline: none;
        }
      `}</style>
    </div>
  )
}