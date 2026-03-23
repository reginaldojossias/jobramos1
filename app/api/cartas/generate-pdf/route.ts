import { NextRequest, NextResponse } from "next/server"
import { getCartaHTML } from "@/components/cartas/carta-template"
import type { Carta } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { carta } = await request.json() as { carta: Carta }
    
    if (!carta) {
      return NextResponse.json({ error: "Carta não fornecida" }, { status: 400 })
    }

    // Obter a URL base do request
    const baseUrl = new URL(request.url).origin

    // Gerar HTML da carta
    const html = getCartaHTML(carta, baseUrl)

    // Retornar o HTML para ser impresso/convertido no cliente
    // O cliente usará window.print() com CSS @media print
    return NextResponse.json({ 
      html,
      filename: `Carta_${carta.entidade_destinataria.replace(/\s+/g, '_')}.pdf`
    })

  } catch (error) {
    console.error("Erro ao gerar PDF:", error)
    return NextResponse.json(
      { error: "Erro ao gerar PDF" },
      { status: 500 }
    )
  }
}
