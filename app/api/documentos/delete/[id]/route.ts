import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteFromB2 } from "@/lib/backblaze-b2"

export async function DELETE(
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
    const { data: documento, error: fetchError } = await supabase
      .from("documentos_digitalizados")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !documento) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      )
    }

    // Deletar do Backblaze B2
    const deleteResult = await deleteFromB2(documento.file_key)

    if (!deleteResult.success) {
      console.error("[API] Erro ao deletar do B2:", deleteResult.error)
      // Continua para deletar do banco mesmo se falhar no B2
    }

    // Deletar do banco de dados
    const { error: deleteError } = await supabase
      .from("documentos_digitalizados")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao deletar documento do banco" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Documento deletado com sucesso",
    })
  } catch (error) {
    console.error("[API] Erro ao deletar:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
