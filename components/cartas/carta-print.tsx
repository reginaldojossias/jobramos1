"use client"

import { useRef, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"

interface Carta {
  id: string
  entidade_destinataria: string
  numero_contrato: string
  data_contrato: string | null
  valor_total: number
  prazo_dias: number
  local: string
  data_carta: string
  nome_advogado: string
  cp_advogado: string
}

interface CartaPrintProps {
  carta: Carta
  onClose: () => void
}

export function CartaPrint({ carta, onClose }: CartaPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.toLocaleDateString("pt-MZ", { month: "long" })
    const year = date.getFullYear()
    return `${day} de ${month} de ${year}`
  }

  const handlePrint = () => {
    window.print()
  }

  const content = (
    <div className="carta-print-overlay fixed inset-0 z-[9999] overflow-auto" style={{ background: "rgba(0,0,0,0.6)" }}>
      {/* Toolbar fixo no topo - so visivel na tela */}
      <div className="carta-toolbar print:hidden sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <h2 className="text-lg font-semibold">Pre-visualizacao da Carta</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#3b5998] text-white rounded-lg hover:bg-[#2d4373] transition-colors text-sm font-medium"
            >
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Area de scroll com paginas centradas */}
      <div className="carta-scroll-area flex flex-col items-center gap-6 py-8 px-4">
        <div ref={printRef} id="carta-print" className="flex flex-col items-center gap-6">
          {/* Pagina 1 */}
          <div className="carta-page">
            {/* Header Wave */}
            <div className="carta-header-wave">
              <Image
                src="/images/blue-wave-header.png"
                alt=""
                fill
                className="object-cover object-right"
                priority
              />
            </div>

            {/* Logo */}
            <div className="carta-logo">
              <Image
                src="/images/magic-pro-logo-full.png"
                alt="Magic Pro Services"
                width={280}
                height={70}
                className="object-contain"
                priority
              />
            </div>

            {/* Watermark */}
            <div className="carta-watermark">
              <Image
                src="/images/atom-watermark-new.png"
                alt=""
                fill
                className="object-contain opacity-30"
              />
            </div>

            {/* Conteudo */}
            <div className="carta-content">
              <div style={{ marginBottom: "18pt" }}>
                <p style={{ fontWeight: "bold", margin: 0 }}>Ao</p>
                <p style={{ fontWeight: "bold", margin: 0 }}>{carta.entidade_destinataria}</p>
              </div>

              <p style={{ marginBottom: "18pt" }}>
                <span style={{ fontWeight: "bold" }}>Assunto:</span> Interpelacao extrajudicial
              </p>

              <p style={{ marginBottom: "12pt" }}>Exmo Senhores,</p>

              <div className="carta-corpo">
                <p>
                  Por procuracao outorgada pela interpelante, a empresa Magic Pro Services, (cuja a copia junta-se em
                  anexo), na qualidade de seus advogados e sob o seu mandato, serve a presente carta para interpelar a
                  V. Excia, nos termos e fundamentos seguintes:
                </p>
                <ol className="carta-lista">
                  <li>
                    Entre a interpelante e o {carta.entidade_destinataria} foi celebrado um contrato
                    de prestacao de servicos graficos, <strong>n.o {carta.numero_contrato}</strong>.
                  </li>
                  <li>A interpelante forneceu os servicos contratados na totalidade e tempestivamente.</li>
                  <li>
                    Foi acordado que a {carta.entidade_destinataria} apos a recepcao dos servicos ira efectuar o pagamento dentro de trinta
                    dias, caso que nao aconteceu ate a data que se grafa a presente carta.
                  </li>
                  <li>
                    Nesta senda, a interpelante por diversas vezes aproximou-se para persuadir ao pagamento das
                    facturas em anexo, de forma a poder fazer face aos compromissos assumidos com os fornecedores,
                    e sem sucesso.
                  </li>
                  <li>
                    No entanto, passam mais de (05) cinco meses sem que a {carta.entidade_destinataria} nao pagou nenhuma das facturas,
                    assim a interpelante vem, por este meio, solicitar a rapida resolucao deste assunto, procedendo a
                    V. Excia com o pagamento das facturas em anexo.
                  </li>
                  <li>
                    E importante recordar que os contratos devem ser pontualmente cumpridos, conforme previsto no
                    artigo 406 do Codigo Civil. Por outro lado, o devedor so fica exonerado da obrigacao mediante
                    cumprimento integral da mesma, nos termos dos artigos 762 e 763, no1, todos do Codigo Civil.
                  </li>
                  <li>
                    Assim, diante de todo o acima exposto, cumpre conceder a V. Excia um prazo impreterivel de{" "}
                    <strong>{carta.prazo_dias} (quinze) dias</strong>, contados a partir da data da recepcao da presente interpelacao, para que proceda com
                    o pagamento das facturas em anexo.
                  </li>
                  <li>
                    A interpelante faz notar que findo este prazo, a falta de oferecimento de qualquer pronunciamento
                    de vossa parte, equivalera a recusa de negociacao, o que determinara o encaminhamento do assunto
                    para as instancias judiciais com vista a reposicao dos deveres violados.
                  </li>
                </ol>
              </div>
            </div>

            {/* Rodape */}
            <div className="carta-footer">
              <p>Av. FPLM No 1710 R/C-2 * Contatos + 258 879 482 800 / +258 867 340 018 * E-mail: magicproservices0@gmail.com</p>
              <p>Maputo - Mocambique</p>
            </div>
          </div>

          {/* Pagina 2 */}
          <div className="carta-page page-break">
            {/* Header Wave */}
            <div className="carta-header-wave">
              <Image
                src="/images/blue-wave-header.png"
                alt=""
                fill
                className="object-cover object-right"
                priority
              />
            </div>

            {/* Logo */}
            <div className="carta-logo">
              <Image
                src="/images/magic-pro-logo-full.png"
                alt="Magic Pro Services"
                width={280}
                height={70}
                className="object-contain"
                priority
              />
            </div>

            {/* Watermark */}
            <div className="carta-watermark">
              <Image
                src="/images/atom-watermark-new.png"
                alt=""
                fill
                className="object-contain opacity-30"
              />
            </div>

            {/* Conteudo */}
            <div className="carta-content">
              <div className="carta-corpo">
                <ol className="carta-lista" start={9}>
                  <li>
                    Por uma resolucao extrajudicial celere e nao litigiosa, subscrevemo-nos com elevada estima e
                    consideracao, cientes de que, tendo em conta os criterios de celeridade, eficacia e boa-fe, a nossa
                    exposicao merecera, da vossa parte, atencao e prontidao.
                  </li>
                </ol>
              </div>

              <p style={{ marginTop: "48pt", textAlign: "center" }}>
                {carta.local}, aos {formatDate(carta.data_carta)}
              </p>

              <div style={{ marginTop: "36pt", textAlign: "center" }}>
                <p style={{ color: "#1a3a6e", fontWeight: "bold", margin: 0 }}>O Advogado</p>
                <div style={{ marginTop: "60pt", display: "inline-block" }}>
                  <div style={{ borderTop: "1px solid #6b7280", width: "256px", margin: "0 auto" }} />
                  <p style={{ marginTop: "6pt", color: "#1a3a6e", fontWeight: "bold" }}>{carta.nome_advogado}</p>
                  <p style={{ color: "#1a3a6e", fontWeight: "bold", margin: 0 }}>CP {carta.cp_advogado}</p>
                </div>
              </div>
            </div>

            {/* Rodape */}
            <div className="carta-footer">
              <p>Av. FPLM No 1710 R/C-2 * Contatos + 258 879 482 800 / +258 867 340 018 * E-mail: magicproservices0@gmail.com</p>
              <p>Maputo - Mocambique</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos do documento - tamanho real A4 e fonte 12pt */}
      <style jsx global>{`
        /* ============================================
           PAGINA A4 - TAMANHO REAL PARA TELA E IMPRESSAO
           ============================================ */
        .carta-page {
          width: 210mm;
          min-height: 297mm;
          background: white;
          position: relative;
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          box-sizing: border-box;
          flex-shrink: 0;
          overflow: hidden;
        }

        .carta-header-wave {
          position: absolute;
          top: 5mm;
          right: 0;
          width: 90%;
          height: 110px;
          z-index: 1;
        }

        .carta-logo {
          position: absolute;
          top: 140px;
          left: 25mm;
          z-index: 2;
        }

        .carta-watermark {
          position: absolute;
          top: 25%;
          left: 15%;
          width: 70%;
          height: 50%;
          pointer-events: none;
          z-index: 1;
        }

        .carta-content {
          padding: 190px 25mm 30mm 25mm;
          position: relative;
          z-index: 10;
          font-size: 12pt;
          line-height: 1.6;
        }

        .carta-corpo {
          text-align: justify;
          font-size: 12pt;
          line-height: 1.6;
        }

        .carta-corpo p {
          margin: 0 0 10pt 0;
          font-size: 12pt;
          line-height: 1.6;
        }

        .carta-lista {
          list-style: decimal;
          padding-left: 24pt;
          margin: 10pt 0;
        }

        .carta-lista li {
          margin-bottom: 8pt;
          font-size: 12pt;
          line-height: 1.6;
          text-align: justify;
        }

        .carta-footer {
          position: absolute;
          bottom: 15mm;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 9pt;
          color: #4b5563;
          z-index: 2;
        }

        .carta-footer p {
          margin: 0;
        }

        /* ============================================
           PREVIEW NA TELA - paginas em escala 100%
           ============================================ */
        @media screen {
          .carta-scroll-area {
            min-width: max-content;
          }
        }

        /* ============================================
           IMPRESSAO - escala 100%, A4 exacto
           ============================================ */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
            padding: 0 !important;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            overflow: visible !important;
            zoom: 1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Esconder TODOS os elementos do dashboard / layout */
          body > *:not(.carta-print-overlay) {
            display: none !important;
          }

          /* O overlay vira o container raiz da impressao */
          .carta-print-overlay {
            position: static !important;
            background: white !important;
            overflow: visible !important;
            inset: auto !important;
            display: block !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: auto !important;
          }

          .carta-toolbar {
            display: none !important;
          }

          .carta-scroll-area {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
            background: white !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
          }

          #carta-print {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            gap: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
          }

          .carta-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            background: white !important;
            overflow: hidden !important;
            transform: none !important;
            zoom: 1 !important;
          }

          .carta-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .page-break {
            page-break-before: always;
            break-before: page;
          }

          .carta-content {
            font-size: 12pt !important;
            line-height: 1.6 !important;
          }

          .carta-corpo,
          .carta-corpo p,
          .carta-lista li {
            font-size: 12pt !important;
            line-height: 1.6 !important;
          }
        }
      `}</style>
    </div>
  )

  // Renderizar no body usando createPortal para escapar do layout do dashboard
  // Isto garante que a impressao nao tenta encaixar a sidebar/layout na pagina A4
  if (!mounted) return null
  return createPortal(content, document.body)
}
