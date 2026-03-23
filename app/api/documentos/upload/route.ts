import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { uploadToB2, generateFileKey } from "@/lib/backblaze-b2"

export const maxDuration = 60 // 60 segundos de timeout

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const tipoDocumento = formData.get("tipo_documento") as string
    const documentoId = formData.get("documento_id") as string
    const descricao = formData.get("descricao") as string | null

    if (!file || !tipoDocumento || !documentoId) {
      return NextResponse.json(
        { error: "Arquivo, tipo de documento e ID do documento são obrigatórios" },
        { status: 400 }
      )
    }

    // Validar tipo de documento
    if (!["factura", "cotacao", "carta"].includes(tipoDocumento)) {
      return NextResponse.json(
        { error: "Tipo de documento inválido" },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo (apenas PDFs e imagens)
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Apenas PDF, JPEG, PNG e WebP." },
        { status: 400 }
      )
    }

    // Limite de tamanho: 4MB (limite do Vercel serverless)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 4MB." },
        { status: 400 }
      )
    }

    // Gerar chave única para o arquivo
    const fileKey = generateFileKey(
      tipoDocumento as "factura" | "cotacao" | "carta",
      documentoId,
      file.name
    )

    // Converter arquivo para Uint8Array
    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)

    console.log("[v0] Upload info:", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      dataLength: fileData.length,
      arrayBufferLength: arrayBuffer.byteLength,
    })

    // Verificar se tem conteúdo
    if (fileData.length === 0) {
      return NextResponse.json(
        { error: "O arquivo está vazio" },
        { status: 400 }
      )
    }

    // Upload para Backblaze B2
    const uploadResult = await uploadToB2(fileKey, fileData, file.type)

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: `Erro no upload: ${uploadResult.error}` },
        { status: 500 }
      )
    }

    // Buscar empresa_id do funcionário
    const { data: funcionario } = await supabase
      .from("funcionarios")
      .select("empresa_id")
      .eq("user_id", user.id)
      .single()

    // Salvar metadados no banco de dados
    const { data: documento, error: dbError } = await supabase
      .from("documentos_digitalizados")
      .insert({
        user_id: user.id,
        tipo_documento: tipoDocumento,
        documento_id: documentoId,
        file_key: fileKey,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        descricao: descricao || null,
        empresa_id: funcionario?.empresa_id || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[API] Erro ao salvar metadados:", dbError.message, dbError.details, dbError.hint)
      return NextResponse.json(
        { error: `Erro ao salvar metadados: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documento,
    })
  } catch (error) {
    console.error("[API] Erro no upload:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
