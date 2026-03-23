import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUploadUrl, generateFileKey } from "@/lib/backblaze-b2"

/**
 * Gera uma URL presigned para upload direto ao Backblaze B2
 * O browser faz upload direto, evitando o limite de 4.5MB do Vercel
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileType, fileSize, tipoDocumento, documentoId, descricao } = body

    if (!fileName || !fileType || !tipoDocumento || !documentoId) {
      return NextResponse.json(
        { error: "Dados incompletos" },
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

    // Validar tipo de arquivo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Apenas PDF, JPEG, PNG e WebP." },
        { status: 400 }
      )
    }

    // Limite de tamanho: 50MB (muito mais generoso agora que não passa pelo Vercel)
    const maxSize = 50 * 1024 * 1024
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 50MB." },
        { status: 400 }
      )
    }

    // Gerar chave única para o arquivo
    const fileKey = generateFileKey(
      tipoDocumento as "factura" | "cotacao" | "carta",
      documentoId,
      fileName
    )

    // Gerar URL presigned para upload direto
    console.log("[v0] Gerando presign URL para:", { fileKey, fileType })
    
    let presignResult
    try {
      presignResult = await getUploadUrl(fileKey, fileType)
    } catch (presignError) {
      console.error("[v0] Erro ao chamar getUploadUrl:", presignError)
      const errorDetail = presignError instanceof Error ? presignError.message : "Erro desconhecido"
      return NextResponse.json(
        { error: `Erro ao gerar URL de upload: ${errorDetail}` },
        { status: 500 }
      )
    }

    if (!presignResult) {
      console.error("[v0] presignResult retornou null")
      return NextResponse.json(
        { error: "Erro ao gerar URL de upload - resultado vazio" },
        { status: 500 }
      )
    }

    // Retornar URL e dados necessários para completar o upload
    return NextResponse.json({
      uploadUrl: presignResult.url,
      fileKey: presignResult.fileKey,
      // Dados para salvar no banco após upload bem-sucedido
      metadata: {
        user_id: user.id,
        tipo_documento: tipoDocumento,
        documento_id: documentoId,
        file_key: fileKey,
        file_name: fileName,
        file_size: fileSize,
        content_type: fileType,
        descricao: descricao || null,
      },
    })
  } catch (error) {
    console.error("[API] Erro ao gerar presigned URL:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
