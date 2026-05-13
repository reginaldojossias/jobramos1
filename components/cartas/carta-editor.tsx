"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Minus,
  Printer,
  X,
  Save,
  FilePlus,
  Type,
  PenTool
} from "lucide-react"
import Image from "next/image"
import type { Carta } from "@/lib/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CartaEditorProps {
  carta: Carta | null
  onSave: (carta: Partial<Carta> & { conteudo_html?: string }) => Promise<void>
  onClose: () => void
  isNew?: boolean
}

// Gera HTML padrão a partir dos dados da carta (para cartas antigas sem conteudo_html)
function gerarHtmlPadraoDaCarta(carta: Carta): string {
  const formatDataLocal = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const months = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const entidade = carta.entidade_destinataria || "[Destinatario]"
  const numeroContrato = carta.numero_contrato || "[N. Contrato]"
  const prazoDias = carta.prazo_dias || 15
  const local = carta.local || "Maputo"
  const dataCarta = formatDataLocal(carta.data_carta)
  const nomeAdvogado = carta.nome_advogado || ""
  const cpAdvogado = carta.cp_advogado || ""

  return `
<p style="margin-top: 20px;"><strong>Assunto:</strong> Interpelacao extrajudicial</p>
<p style="margin-top: 15px;">Exmo Senhores,</p>
<p style="text-align: justify;">
Por procuracao outorgada pela interpelante, a empresa Magic Pro Services, (cuja a copia junta-se em anexo), na qualidade de seus advogados e sob o seu mandato, serve a presente carta para interpelar a V. Excia, nos termos e fundamentos seguintes:
</p>
<ol>
  <li style="text-align: justify;">Entre a interpelante e o ${entidade} foi celebrado um contrato de prestacao de servicos graficos, <strong>n.o ${numeroContrato}</strong>.</li>
  <li style="text-align: justify;">A interpelante forneceu os servicos contratados na totalidade e tempestivamente.</li>
  <li style="text-align: justify;">Foi acordado que a ${entidade} apos a recepcao dos servicos ira efectuar o pagamento dentro de trinta dias, caso que nao aconteceu ate a data que se grafa a presente carta.</li>
  <li style="text-align: justify;">Nesta senda, a interpelante por diversas vezes aproximou-se para persuadir ao pagamento das facturas em anexo, de forma a poder fazer face aos compromissos assumidos com os fornecedores, e sem sucesso.</li>
  <li style="text-align: justify;">No entanto, passam mais de (05) cinco meses sem que a ${entidade} nao pagou nenhuma das facturas, assim a interpelante vem, por este meio, solicitar a rapida resolucao deste assunto, procedendo a V. Excia com o pagamento das facturas em anexo.</li>
  <li style="text-align: justify;">E importante recordar que os contratos devem ser pontualmente cumpridos, conforme previsto no artigo 406 do Codigo Civil. Por outro lado, o devedor so fica exonerado da obrigacao mediante cumprimento integral da mesma, nos termos dos artigos 762 e 763, no1, todos do Codigo Civil.</li>
  <li style="text-align: justify;">Assim, diante de todo o acima exposto, cumpre conceder a V. Excia um prazo impreterivel de <strong>${prazoDias} dias</strong>, contados a partir da data da recepcao da presente interpelacao, para que proceda com o pagamento das facturas em anexo.</li>
  <li style="text-align: justify;">A interpelante faz notar que findo este prazo, a falta de oferecimento de qualquer pronunciamento de vossa parte, equivalera a recusa de negociacao, o que determinara o encaminhamento do assunto para as instancias judiciais com vista a reposicao dos deveres violados.</li>
  <li style="text-align: justify;">Por uma resolucao extrajudicial celere e nao litigiosa, subscrevemo-nos com elevada estima e consideracao, cientes de que, tendo em conta os criterios de celeridade, eficacia e boa-fe, a nossa exposicao merecera, da vossa parte, atencao e prontidao.</li>
</ol>
<p style="margin-top: 60px; text-align: center;">${local}, aos ${dataCarta}</p>
${nomeAdvogado ? `
<div style="margin-top: 40px; text-align: center;">
  <p style="font-weight: bold; color: #1a3a6e;">O Advogado</p>
  <div style="width: 200px; border-top: 1px solid #666; margin: 50px auto 10px;"></div>
  <p style="font-weight: bold; color: #1a3a6e;">${nomeAdvogado}</p>
  ${cpAdvogado ? `<p style="font-weight: bold; color: #1a3a6e;">CP ${cpAdvogado}</p>` : ""}
</div>
` : `
<div style="margin-top: 60px; text-align: center;">
  <div style="width: 200px; border-top: 1px solid #666; margin: 0 auto;"></div>
  <p style="margin-top: 5px;">(Assinatura)</p>
</div>
`}
  `.trim()
}

export function CartaEditor({ carta, onSave, onClose, isNew = false }: CartaEditorProps) {
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Configurações de assinatura
  const [signatureType, setSignatureType] = useState<"advogado" | "simples" | "cargo">("advogado")
  const [signatureCount, setSignatureCount] = useState<1 | 2 | 3>(1)
  const [signatureWidth, setSignatureWidth] = useState("180")

  // Form data para metadados
  const [formData, setFormData] = useState({
    entidade_destinataria: carta?.entidade_destinataria || "",
    numero_contrato: carta?.numero_contrato || "",
    data_contrato: carta?.data_contrato || "",
    valor_total: carta?.valor_total?.toString() || "",
    prazo_dias: carta?.prazo_dias?.toString() || "15",
    local: carta?.local || "Maputo",
    data_carta: carta?.data_carta || new Date().toISOString().split("T")[0],
    nome_advogado: carta?.nome_advogado || "",
    cp_advogado: carta?.cp_advogado || "",
  })

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Comandos de formatacao
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  // Inserir linha de assinatura customizável
  const insertSignatureLine = () => {
    let signatureHtml = ""

    if (signatureCount === 1) {
      signatureHtml = `
        <div style="margin-top: 60px; text-align: center;">
          <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
          <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
        </div>
      `
    } else if (signatureCount === 2) {
      signatureHtml = `
        <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
          </div>
          <div>
            <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
          </div>
        </div>
      `
    } else {
      signatureHtml = `
        <div style="margin-top: 60px; display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
          </div>
          <div>
            <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
          </div>
          <div>
            <div style="width: ${signatureWidth}px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px; font-size: 10pt;">(${signatureType === "advogado" ? "Advogado" : signatureType === "cargo" ? "Nome / Cargo" : "Assinatura"})</p>
          </div>
        </div>
      `
    }

    document.execCommand("insertHTML", false, signatureHtml)
    editorRef.current?.focus()
  }

  const insertHorizontalLine = () => {
    document.execCommand("insertHTML", false, "<hr style='border: none; border-top: 1px solid #333; margin: 15px 0;' />")
    editorRef.current?.focus()
  }

  // Adicionar nova página
  const addNewPage = () => {
    const newPageHtml = `
      <div style="page-break-before: always; padding-top: 20px;">
        <p><br></p>
      </div>
    `
    document.execCommand("insertHTML", false, newPageHtml)
    editorRef.current?.focus()
  }

  // Mudar tamanho da fonte
  const changeFontSize = (size: string) => {
    document.execCommand("fontSize", false, size)
    editorRef.current?.focus()
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const conteudoHtml = editorRef.current?.innerHTML || ""
      await onSave({
        ...formData,
        valor_total: parseFloat(formData.valor_total) || 0,
        prazo_dias: parseInt(formData.prazo_dias) || 15,
        conteudo_html: conteudoHtml,
      })
    } catch (error) {
      console.error("[v0] Erro ao guardar carta:", error)
    }
    setIsSaving(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const months = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  const content = (
    <div className="carta-editor-container fixed inset-0 z-[9999] bg-neutral-800 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-1">
          <h2 className="text-lg font-semibold mr-4">
            {isNew ? "Nova Carta" : "Editar Carta"}
          </h2>

          {/* Separador */}
          <div className="w-px h-6 bg-neutral-300 mx-2" />

          {/* Formatacao de texto */}
          <Button variant="ghost" size="icon" onClick={() => execCommand("bold")} title="Negrito (Ctrl+B)">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => execCommand("italic")} title="Italico (Ctrl+I)">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => execCommand("underline")} title="Sublinhado (Ctrl+U)">
            <Underline className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-neutral-300 mx-2" />

          {/* Tamanho da fonte */}
          <Select onValueChange={changeFontSize} defaultValue="3">
            <SelectTrigger className="w-24 h-8">
              <Type className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Pequeno</SelectItem>
              <SelectItem value="2">Normal-</SelectItem>
              <SelectItem value="3">Normal</SelectItem>
              <SelectItem value="4">Normal+</SelectItem>
              <SelectItem value="5">Grande</SelectItem>
              <SelectItem value="6">Maior</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-neutral-300 mx-2" />

          {/* Alinhamento */}
          <Button variant="ghost" size="icon" onClick={() => execCommand("justifyLeft")} title="Alinhar a esquerda">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => execCommand("justifyCenter")} title="Centralizar">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => execCommand("justifyRight")} title="Alinhar a direita">
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-neutral-300 mx-2" />

          {/* Listas */}
          <Button variant="ghost" size="icon" onClick={() => execCommand("insertUnorderedList")} title="Lista com marcadores">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => execCommand("insertOrderedList")} title="Lista numerada">
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-neutral-300 mx-2" />

          {/* Elementos especiais */}
          <Button variant="ghost" size="sm" onClick={insertHorizontalLine} title="Linha horizontal">
            <Minus className="h-4 w-4 mr-1" />
            Linha
          </Button>
          <Button variant="ghost" size="sm" onClick={insertSignatureLine} title="Barra de assinatura">
            <PenTool className="h-4 w-4 mr-1" />
            Assinatura
          </Button>
          <Button variant="ghost" size="sm" onClick={addNewPage} title="Adicionar nova página">
            <FilePlus className="h-4 w-4 mr-1" />
            Nova Página
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "A guardar..." : "Guardar"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar de metadados + Area de edicao */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar com metadados */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto print:hidden">
          <h3 className="font-semibold mb-4">Dados da Carta</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="entidade" className="text-xs">Destinatario</Label>
              <Input
                id="entidade"
                value={formData.entidade_destinataria}
                onChange={(e) => setFormData({ ...formData, entidade_destinataria: e.target.value })}
                placeholder="Nome da entidade"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="contrato" className="text-xs">N. Contrato</Label>
              <Input
                id="contrato"
                value={formData.numero_contrato}
                onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                placeholder="Numero do contrato"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="data_contrato" className="text-xs">Data Contrato</Label>
              <Input
                id="data_contrato"
                type="date"
                value={formData.data_contrato}
                onChange={(e) => setFormData({ ...formData, data_contrato: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="valor" className="text-xs">Valor (MZN)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                placeholder="0.00"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="prazo" className="text-xs">Prazo (dias)</Label>
              <Input
                id="prazo"
                type="number"
                value={formData.prazo_dias}
                onChange={(e) => setFormData({ ...formData, prazo_dias: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="local" className="text-xs">Local</Label>
              <Input
                id="local"
                value={formData.local}
                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="data_carta" className="text-xs">Data da Carta</Label>
              <Input
                id="data_carta"
                type="date"
                value={formData.data_carta}
                onChange={(e) => setFormData({ ...formData, data_carta: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            {/* Separador */}
            <div className="border-t pt-3 mt-4">
              <h4 className="font-semibold text-sm mb-3">Configurações de Assinatura</h4>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="sig-type" className="text-xs">Tipo de Assinatura</Label>
                  <Select value={signatureType} onValueChange={(v: any) => setSignatureType(v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples">Assinatura Simples</SelectItem>
                      <SelectItem value="advogado">Advogado</SelectItem>
                      <SelectItem value="cargo">Nome / Cargo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sig-count" className="text-xs">Quantidade de Assinaturas</Label>
                  <Select value={signatureCount.toString()} onValueChange={(v: any) => setSignatureCount(parseInt(v))}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Assinatura</SelectItem>
                      <SelectItem value="2">2 Assinaturas</SelectItem>
                      <SelectItem value="3">3 Assinaturas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sig-width" className="text-xs">Largura da Linha ({signatureWidth}px)</Label>
                  <Input
                    id="sig-width"
                    type="range"
                    min="100"
                    max="300"
                    value={signatureWidth}
                    onChange={(e) => setSignatureWidth(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Campos opcionais de advogado */}
            {signatureType === "advogado" && (
              <div className="border-t pt-3 mt-4">
                <h4 className="font-semibold text-sm mb-3">Dados do Advogado (opcional)</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="advogado" className="text-xs">Advogado</Label>
                    <Input
                      id="advogado"
                      value={formData.nome_advogado}
                      onChange={(e) => setFormData({ ...formData, nome_advogado: e.target.value })}
                      placeholder="Nome do advogado"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cedula" className="text-xs">Cedula Profissional</Label>
                    <Input
                      id="cedula"
                      value={formData.cp_advogado}
                      onChange={(e) => setFormData({ ...formData, cp_advogado: e.target.value })}
                      placeholder="CP"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Area de preview/edicao - Documento A4 */}
        <div className="flex-1 overflow-auto p-6 flex justify-center" style={{ background: '#525659' }}>
          <div
            className="carta-page bg-white shadow-xl relative"
            style={{
              width: '210mm',
              minHeight: '297mm',
              fontFamily: '"Times New Roman", serif',
            }}
            id="carta-editor-print"
          >
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

            {/* Logo */}
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

            {/* Conteudo editavel - Layout otimizado */}
            <div className="pt-[180px] px-[20mm] pb-[20mm] relative z-10">
              {/* Destinatario - editável se necessário */}
              {formData.entidade_destinataria && (
                <div className="mb-4">
                  <p className="font-bold">Ao</p>
                  <p className="font-bold">{formData.entidade_destinataria}</p>
                </div>
              )}

              {/* Area de conteudo editavel - tamanho otimizado */}
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[500px] outline-none text-[11pt] leading-relaxed focus:bg-blue-50/30"
                style={{ lineHeight: 1.6 }}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{
                  __html: carta?.conteudo_html
                    ? carta.conteudo_html
                    : carta
                      ? gerarHtmlPadraoDaCarta(carta)
                      : "<p>Comece a escrever aqui...</p>"
                }}
              />
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
          .carta-editor-container > *:not(#carta-editor-print):not(.flex-1) {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .carta-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          body {
            background: white !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
