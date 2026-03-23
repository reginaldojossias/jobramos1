import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Confirma o upload e salva os metadados no banco de dados
 * Chamado após o upload direto ao B2 ser concluído com sucesso
 */
export async function POST(request: NextRequest) {
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

    const empresaId = funcionario.empresa_id

    const body = await request.json()
    const { fileKey, fileName, fileType, fileSize, tipoDocumento, documentoId, descricao } = body

    // Validar que os campos necessários existem
    if (!fileKey || !tipoDocumento || !documentoId) {
      return NextResponse.json(
        { error: "Dados de metadados incompletos" },
        { status: 400 }
      )
    }

    // Preparar dados para inserção
    const documentoData = {
      tipo_documento: tipoDocumento,
      documento_id: documentoId,
      file_key: fileKey,
      file_name: fileName,
      file_size: fileSize || 0,
      content_type: fileType,
      descricao: descricao || null,
      empresa_id: empresaId,
    }

    // Salvar metadados no banco de dados
    const { data: documento, error: dbError } = await supabase
      .from("documentos_digitalizados")
      .insert(documentoData)
      .select()
      .single()

    if (dbError) {
      console.error("[API] Erro ao salvar metadados:", dbError)
      return NextResponse.json(
        { error: "Erro ao salvar metadados do documento" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documento,
    })
  } catch (error) {
    console.error("[API] Erro ao confirmar upload:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
