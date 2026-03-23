"use client"

import React from "react"

import { useState, useRef } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, FileText, Download, Trash2, Loader2, File, ImageIcon } from "lucide-react"

interface DocumentoUploadProps {
  tipoDocumento: "factura" | "cotacao" | "carta"
  documentoId: string
  documentoNumero?: string
}

interface Documento {
  id: string
  file_name: string
  file_size: number
  content_type: string
  descricao: string | null
  created_at: string
}

const fetcher = async (url: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("documentos_digitalizados")
    .select("*")
    .eq("tipo_documento", url.split("/")[0])
    .eq("documento_id", url.split("/")[1])
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

export function DocumentoUpload({
  tipoDocumento,
  documentoId,
  documentoNumero,
}: DocumentoUploadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [descricao, setDescricao] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: documentos, mutate } = useSWR<Documento[]>(
    documentoId ? `${tipoDocumento}/${documentoId}` : null,
    fetcher
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    // Verificar tamanho máximo (4MB para evitar limite da Vercel)
    const MAX_SIZE = 4 * 1024 * 1024
    if (selectedFile.size > MAX_SIZE) {
      alert("O ficheiro é muito grande. Tamanho máximo: 4MB")
      return
    }

    setIsUploading(true)

    try {
      // Upload via backend (evita problemas de CORS)
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("tipo_documento", tipoDocumento)
      formData.append("documento_id", documentoId)
      if (descricao) {
        formData.append("descricao", descricao)
      }

      const response = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao fazer upload")
      }

      // Limpar formulário e atualizar lista
      setSelectedFile(null)
      setDescricao("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      mutate()
    } catch (error) {
      console.error("Erro no upload:", error)
      alert(error instanceof Error ? error.message : "Erro ao fazer upload")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (documento: Documento) => {
    setDownloadingId(documento.id)

    try {
      const response = await fetch(`/api/documentos/download/${documento.id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro no download")
      }

      // Abrir URL em nova aba ou fazer download
      window.open(result.url, "_blank")
    } catch (error) {
      console.error("Erro no download:", error)
      alert(error instanceof Error ? error.message : "Erro ao fazer download")
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (documento: Documento) => {
    if (!confirm(`Tem certeza que deseja apagar "${documento.file_name}"?`)) {
      return
    }

    setDeletingId(documento.id)

    try {
      const response = await fetch(`/api/documentos/delete/${documento.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao apagar")
      }

      mutate()
    } catch (error) {
      console.error("Erro ao apagar:", error)
      alert(error instanceof Error ? error.message : "Erro ao apagar documento")
    } finally {
      setDeletingId(null)
    }
  }

  const tipoLabel = {
    factura: "Factura",
    cotacao: "Cotacao",
    carta: "Carta",
  }[tipoDocumento]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <File className="h-4 w-4" />
          Documentos ({documentos?.length || 0})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Documentos Digitalizados - {tipoLabel} {documentoNumero}
          </DialogTitle>
          <DialogDescription>
            Carregue e gerencie documentos digitalizados anexados a este registo.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Form */}
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <h4 className="font-medium text-sm">Carregar Novo Documento</h4>

          <div className="space-y-2">
            <Label htmlFor="file">Ficheiro (PDF, JPEG, PNG - max 4MB)</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getFileIcon(selectedFile.type)}
              <span>{selectedFile.name}</span>
              <span>({formatFileSize(selectedFile.size)})</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao (opcional)</Label>
            <Input
              id="descricao"
              placeholder="Ex: Documento digitalizado assinado"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Carregar Documento
              </>
            )}
          </Button>
        </div>

        {/* Documents List */}
        {documentos && documentos.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ficheiro</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.content_type)}
                        <div>
                          <div className="font-medium text-sm">{doc.file_name}</div>
                          {doc.descricao && (
                            <div className="text-xs text-muted-foreground">
                              {doc.descricao}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(doc.created_at).toLocaleDateString("pt-MZ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum documento carregado</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
