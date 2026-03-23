"use client"

import { useRef } from "react"
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const day = date.getDate()
    const month = date.toLocaleDateString("pt-MZ", { month: "long" })
    const year = date.getFullYear()
    return `${day} de ${month} de ${year}`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-auto">
        {/* Modal Header - Only visible on screen */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between print:hidden z-10">
          <h2 className="text-lg font-semibold">Pre-visualizacao da Carta</h2>
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

        {/* Print Content - Page 1 */}
        <div ref={printRef} className="bg-white" id="carta-print">
          {/* Página 1 */}
          <div className="carta-page page-1 relative w-[210mm] min-h-[297mm] mx-auto bg-white" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Header Wave */}
            <div className="absolute top-[5mm] right-0 w-[90%]" style={{ height: "110px" }}>
              <Image
                src="/images/blue-wave-header.png"
                alt=""
                fill
                className="object-cover object-right"
                priority
              />
            </div>

            {/* Logo Section */}
            <div className="absolute top-[140px] left-[25mm]">
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "25%" }}>
              <div className="relative w-[70%] h-[50%]">
                <Image
                  src="/images/atom-watermark-new.png"
                  alt=""
                  fill
                  className="object-contain opacity-30"
                />
              </div>
            </div>

            {/* Content */}
            <div className="pt-[190px] px-[25mm] pb-[30mm] relative z-10">
              {/* Destinatario */}
              <div className="mb-6">
                <p className="font-bold">Ao</p>
                <p className="font-bold">{carta.entidade_destinataria}</p>
              </div>

              {/* Assunto */}
              <p className="mb-6">
                <span className="font-bold">Assunto:</span> Interpelacao extrajudicial
              </p>

              {/* Saudacao */}
              <p className="mb-4">Exmo Senhores,</p>

              {/* Corpo */}
              <div className="text-sm leading-relaxed text-justify space-y-3">
                <p>
                  Por procuracao outorgada pela interpelante, a empresa Magic Pro Services, (cuja a copia junta-se em
                  anexo), na qualidade de seus advogados e sob o seu mandato, serve a presente carta para interpelar a
                  V. Excia, nos termos e fundamentos seguintes:
                </p>
                <ol className="list-decimal pl-6 space-y-2">
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

            {/* Footer */}
            <div className="absolute bottom-[15mm] left-0 right-0 text-center text-xs text-gray-600">
              <p>Av. FPLM No 1710 R/C-2 * Contatos + 258 879 482 800 / +258 867 340 018 * E-mail: magicproservices0@gmail.com</p>
              <p>Maputo - Mocambique</p>
            </div>
          </div>

          {/* Página 2 */}
          <div className="carta-page page-2 relative w-[210mm] min-h-[297mm] mx-auto bg-white page-break" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
            {/* Header Wave */}
            <div className="absolute top-[5mm] right-0 w-[90%]" style={{ height: "110px" }}>
              <Image
                src="/images/blue-wave-header.png"
                alt=""
                fill
                className="object-cover object-right"
                priority
              />
            </div>

            {/* Logo Section */}
            <div className="absolute top-[140px] left-[25mm]">
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "15%" }}>
              <div className="relative w-[70%] h-[60%]">
                <Image
                  src="/images/atom-watermark-new.png"
                  alt=""
                  fill
                  className="object-contain opacity-30"
                />
              </div>
            </div>

            {/* Content */}
            <div className="pt-[190px] px-[25mm] pb-[30mm] relative z-10">
              <ol className="list-decimal pl-6 space-y-2 text-sm leading-relaxed text-justify" start={9}>
                <li>
                  Por uma resolucao extrajudicial celere e nao litigiosa, subscrevemo-nos com elevada estima e
                  consideracao, cientes de que, tendo em conta os criterios de celeridade, eficacia e boa-fe, a nossa
                  exposicao merecera, da vossa parte, atencao e prontidao.
                </li>
              </ol>

              {/* Data e Local - Centralizado */}
              <p className="mt-16 text-center text-sm">
                {carta.local}, aos {formatDate(carta.data_carta)}
              </p>

              {/* Assinatura - Centralizada */}
              <div className="mt-10 text-center">
                <p className="text-[#1a3a6e] font-bold">O Advogado</p>
                <div className="mt-16 inline-block">
                  <div className="border-t border-gray-500 w-64 mx-auto" />
                  <p className="mt-2 text-[#1a3a6e] font-bold">{carta.nome_advogado}</p>
                  <p className="text-[#1a3a6e] font-bold">CP {carta.cp_advogado}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-[15mm] left-0 right-0 text-center text-xs text-gray-600">
              <p>Av. FPLM No 1710 R/C-2 * Contatos + 258 879 482 800 / +258 867 340 018 * E-mail: magicproservices0@gmail.com</p>
              <p>Maputo - Mocambique</p>
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
          #carta-print,
          #carta-print * {
            visibility: visible;
          }
          #carta-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .carta-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            background: white !important;
          }
          .carta-page:last-child {
            page-break-after: auto;
          }
          .page-break {
            page-break-before: always;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  )
}
