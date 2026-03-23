import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUploadUrl, generateFileKey, getB2NativeUploadUrl } from "@/lib/backblaze-b2"

export async function POST(request: Request) {
  try {
    // Verificar autenticação via Supabase Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar funcionário e empresa do utilizador
    const { data: funcionario, error: funcError } = await supabase
      .from("funcionarios")
      .select("id, empresa_id")
      .eq("user_id", user.id)
      .single()

    if (funcError || !funcionario) {
      return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 401 })
    }

    const funcionarioId = funcionario.id
    const empresaId = funcionario.empresa_id

    // Obter dados do request
    const body = await request.json()
    const { fileName, fileType, tipoDocumento, documentoId } = body

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

    // Gerar chave única para o arquivo
    const fileKey = generateFileKey(tipoDocumento as "factura" | "cotacao" | "carta", documentoId, fileName)

    // Obter URL presigned para upload via S3 Compatible API
    // Esta API suporta CORS para uploads diretos do browser
    console.log("[v0] Gerando presigned URL para:", { fileKey, fileType })
    
    const uploadData = await getUploadUrl(fileKey, fileType)

    if (!uploadData) {
      // Verificar qual configuração está em falta
      const missing = []
      if (!process.env.B2_ENDPOINT) missing.push("B2_ENDPOINT")
      if (!process.env.B2_APPLICATION_KEY_ID) missing.push("B2_APPLICATION_KEY_ID")
      if (!process.env.B2_APPLICATION_KEY) missing.push("B2_APPLICATION_KEY")
      if (!process.env.B2_BUCKET_NAME) missing.push("B2_BUCKET_NAME")
      
      const errorMsg = missing.length > 0
        ? `Variáveis em falta: ${missing.join(", ")}`
        : "Erro ao gerar URL de upload. Verifique as configurações do Backblaze B2."
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      )
    }

    return NextResponse.json({
      uploadUrl: uploadData.url,
      fileKey: uploadData.fileKey,
      // Dados para confirmar depois do upload
      metadata: {
        fileKey: uploadData.fileKey,
        fileName,
        fileType,
        tipoDocumento,
        documentoId,
        empresaId,
        funcionarioId,
      },
    })
  } catch (error) {
    console.error("[v0] Erro ao obter URL de upload:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
