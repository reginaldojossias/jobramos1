import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getDownloadUrl } from "@/lib/backblaze-b2"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    // Buscar documento no banco
    const { data: documento, error } = await supabase
      .from("documentos_digitalizados")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !documento) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      )
    }

    // Gerar URL de download assinada (válida por 1 hora)
    const downloadUrl = await getDownloadUrl(documento.file_key)

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "Erro ao gerar URL de download" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: downloadUrl,
      fileName: documento.file_name,
      contentType: documento.content_type,
    })
  } catch (error) {
    console.error("[API] Erro no download:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
