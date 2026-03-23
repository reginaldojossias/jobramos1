import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, attachments, tipo, referencia_id, enviado_por } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Campos obrigatórios: to, subject, html" },
        { status: 400 }
      )
    }

    const GMAIL_USER = process.env.GMAIL_USER
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: "Credenciais Gmail não configuradas (GMAIL_USER e GMAIL_APP_PASSWORD)" },
        { status: 500 }
      )
    }

    // Configurar transporter Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })

    // Preparar anexos se existirem
    const mailAttachments = attachments?.map((att: { filename: string; content: string; contentType: string }) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
      contentType: att.contentType,
    })) || []

    // Enviar email
    const info = await transporter.sendMail({
      from: `"Magic Pro Services" <${GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject: subject,
      html: html,
      attachments: mailAttachments,
    })

    // Guardar registo do email enviado na base de dados
    const supabase = await createClient()
    
    // Buscar nome e email do funcionario que enviou
    let enviadoPorNome = null
    let enviadoPorEmail = null
    if (enviado_por) {
      const { data: funcionario } = await supabase
        .from("funcionarios")
        .select("nome, email")
        .eq("id", enviado_por)
        .single()
      if (funcionario) {
        enviadoPorNome = funcionario.nome
        enviadoPorEmail = funcionario.email
      }
    }
    
    const { error: dbError } = await supabase.from("emails_enviados").insert({
      destinatario: Array.isArray(to) ? to.join(", ") : to,
      assunto: subject,
      corpo: html,
      tipo_documento: tipo || "outro",
      documento_id: referencia_id || null,
      enviado_por: enviado_por || null,
      enviado_por_nome: enviadoPorNome,
      enviado_por_email: enviadoPorEmail,
      status: "enviado",
    })

    if (dbError) {
      console.error("[v0] Erro ao guardar email na BD:", dbError)
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      message: "Email enviado com sucesso",
    })
  } catch (error) {
    console.error("[v0] Erro ao enviar email:", error)
    
    // Tentar guardar o erro na base de dados
    try {
      const supabase = await createClient()
      const requestClone = request.clone()
      const body = await requestClone.json().catch(() => ({}))
      
      await supabase.from("emails_enviados").insert({
        destinatario: body.to || "desconhecido",
        assunto: body.subject || "Sem assunto",
        corpo: body.html || "",
        tipo_documento: body.tipo || "outro",
        documento_id: body.referencia_id || null,
        enviado_por: body.enviado_por || null,
        status: "falhou",
        erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } catch {
      // Ignora erro ao guardar falha
    }

    return NextResponse.json(
      { error: "Falha ao enviar email", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    )
  }
}
