"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Mail, Send, Loader2, CheckCircle, XCircle } from "lucide-react"

interface EmailDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultSubject?: string
  defaultBody?: string
  documentType: "carta" | "cotacao" | "factura"
  documentNumber?: string
  attachmentHtml?: string
  referenciaId?: string
  enviadoPor?: string
}

export function EmailDialog({
  isOpen,
  onClose,
  defaultSubject = "",
  defaultBody = "",
  documentType,
  documentNumber,
  attachmentHtml,
  referenciaId,
  enviadoPor,
}: EmailDialogProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSend = async () => {
    if (!to || !subject) {
      setErrorMessage("Por favor, preencha os campos obrigatórios (Para e Assunto)")
      setStatus("error")
      return
    }

    setIsLoading(true)
    setStatus("idle")
    setErrorMessage("")

    try {
      // Construct the full HTML email
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #2962ff 0%, #1e88e5 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            .document { border: 1px solid #ddd; padding: 20px; margin: 20px 0; background: #fafafa; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Magic Pro Services</h1>
            <p>A Sua satisfação é o Nosso Objectivo</p>
          </div>
          <div class="content">
            <p>${body.replace(/\n/g, "<br>")}</p>
            ${attachmentHtml ? `<div class="document">${attachmentHtml}</div>` : ""}
          </div>
          <div class="footer">
            <p>Magic Pro Services</p>
            <p>Contacto: +258 879 482 886 | Email: magicproservices@gmail.com</p>
            <p>Maputo - Moçambique</p>
          </div>
        </body>
        </html>
      `

      const recipients = cc ? [to, ...cc.split(",").map((e) => e.trim())] : [to]

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipients,
          subject,
          html: fullHtml,
          tipo: documentType,
          referencia_id: referenciaId,
          enviado_por: enviadoPor,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar email")
      }

      setStatus("success")
      setTimeout(() => {
        onClose()
        // Reset form
        setTo("")
        setCc("")
        setSubject(defaultSubject)
        setBody(defaultBody)
        setStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("[v0] Erro ao enviar email:", error)
      setErrorMessage(error instanceof Error ? error.message : "Erro ao enviar email")
      setStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  const getDocumentLabel = () => {
    switch (documentType) {
      case "carta":
        return "Carta de Interpelação"
      case "cotacao":
        return "Cotação"
      case "factura":
        return "Factura"
      default:
        return "Documento"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar {getDocumentLabel()} {documentNumber ? `Nº ${documentNumber}` : ""} por Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span>Email enviado com sucesso!</span>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <XCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <Label htmlFor="to" className="text-sm font-medium">
                Para <span className="text-red-500">*</span>
              </Label>
              <Input
                id="to"
                type="email"
                placeholder="email@exemplo.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cc" className="text-sm font-medium">
                CC (opcional)
              </Label>
              <Input
                id="cc"
                type="text"
                placeholder="email1@exemplo.com, email2@exemplo.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separe múltiplos emails com vírgula
              </p>
            </div>

            <div>
              <Label htmlFor="subject" className="text-sm font-medium">
                Assunto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="Assunto do email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="body" className="text-sm font-medium">
                Mensagem
              </Label>
              <Textarea
                id="body"
                placeholder="Escreva a sua mensagem aqui..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 min-h-32"
                rows={6}
              />
            </div>
          </div>

          {attachmentHtml && (
            <div className="border rounded-lg p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                O documento será incluído no corpo do email
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isLoading || status === "success"}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
