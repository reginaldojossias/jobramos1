import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Cache para autorização B2 nativa
let b2AuthCache: {
  authorizationToken: string
  apiUrl: string
  downloadUrl: string
  expiresAt: number
} | null = null

/**
 * Autentica com a API nativa do Backblaze B2
 * Necessário para obter URLs de upload direto
 */
export async function authorizeB2(): Promise<{
  authorizationToken: string
  apiUrl: string
  downloadUrl: string
} | null> {
  console.log("[B2] authorizeB2 chamado")
  
  // Verificar cache (válido por 20 horas, token dura 24h)
  if (b2AuthCache && Date.now() < b2AuthCache.expiresAt) {
    console.log("[B2] Usando cache de autorização")
    return b2AuthCache
  }

  const keyId = process.env.B2_APPLICATION_KEY_ID || ""
  const key = process.env.B2_APPLICATION_KEY || ""

  console.log("[B2] Credenciais:", {
    hasKeyId: !!keyId,
    keyIdLength: keyId.length,
    hasKey: !!key,
    keyLength: key.length,
  })

  if (!keyId || !key) {
    console.error("[B2] Credenciais não configuradas")
    return null
  }

  try {
    const credentials = Buffer.from(`${keyId}:${key}`).toString("base64")
    console.log("[B2] Chamando b2_authorize_account...")
    
    const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    })

    console.log("[B2] Resposta autorização:", response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error("[B2] Erro na autorização:", error)
      return null
    }

    const data = await response.json()
    console.log("[B2] Autorização bem sucedida:", {
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
    })
    
    b2AuthCache = {
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiUrl,
      downloadUrl: data.downloadUrl,
      expiresAt: Date.now() + 20 * 60 * 60 * 1000, // 20 horas
    }

    return b2AuthCache
  } catch (error) {
    console.error("[B2] Erro ao autorizar:", error)
    return null
  }
}

/**
 * Obtém URL de upload da API nativa do B2
 * Esta URL permite upload direto do browser com CORS
 */
export async function getB2NativeUploadUrl(): Promise<{
  uploadUrl: string
  authorizationToken: string
} | null> {
  console.log("[B2] getB2NativeUploadUrl chamado")
  
  const auth = await authorizeB2()
  if (!auth) {
    console.error("[B2] authorizeB2 falhou")
    return null
  }

  const bucketId = process.env.B2_BUCKET_ID || ""
  console.log("[B2] Bucket ID:", bucketId ? `${bucketId.substring(0, 10)}...` : "NOT SET")
  
  if (!bucketId) {
    console.error("[B2] B2_BUCKET_ID não configurado")
    return null
  }

  try {
    console.log("[B2] Chamando b2_get_upload_url...")
    const response = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId }),
    })

    console.log("[B2] Resposta upload URL:", response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error("[B2] Erro ao obter upload URL:", error)
      return null
    }

    const data = await response.json()
    console.log("[B2] Upload URL obtida com sucesso")
    
    return {
      uploadUrl: data.uploadUrl,
      authorizationToken: data.authorizationToken,
    }
  } catch (error) {
    console.error("[B2] Erro ao obter upload URL:", error)
    return null
  }
}

// Validar variaveis de ambiente
function getB2Config() {
  let endpoint = process.env.B2_ENDPOINT || ""
  const keyId = process.env.B2_APPLICATION_KEY_ID || ""
  const key = process.env.B2_APPLICATION_KEY || ""
  const bucketName = process.env.B2_BUCKET_NAME || ""

  // Garantir que o endpoint tem o protocolo https://
  if (endpoint && !endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}`
  }

  // Remover trailing slash se existir
  endpoint = endpoint.replace(/\/+$/, "")

  console.log("[v0] B2 Config:", {
    endpoint: endpoint || "NOT SET",
    keyIdLength: keyId.length,
    keyLength: key.length,
    bucketName: bucketName || "NOT SET",
  })

  if (!endpoint || !keyId || !key || !bucketName) {
    const missing = [
      !endpoint && "B2_ENDPOINT",
      !keyId && "B2_APPLICATION_KEY_ID",
      !key && "B2_APPLICATION_KEY",
      !bucketName && "B2_BUCKET_NAME",
    ].filter(Boolean)
    
    throw new Error(`Backblaze B2 não configurado. Faltam: ${missing.join(", ")}`)
  }

  // Validar que o endpoint e uma URL valida
  try {
    new URL(endpoint)
  } catch {
    throw new Error(`B2_ENDPOINT inválido: "${endpoint}". Deve ser uma URL completa como https://s3.us-east-005.backblazeb2.com`)
  }

  return { endpoint, keyId, key, bucketName }
}

// Criar cliente S3 sob demanda para evitar erros na inicializacao
let s3Client: S3Client | null = null

function createS3Client() {
  if (!s3Client) {
    const config = getB2Config()
    
    // Extrair a região do endpoint (ex: s3.us-east-005.backblazeb2.com -> us-east-005)
    let region = "us-east-005"
    try {
      const endpointUrl = new URL(config.endpoint)
      const hostParts = endpointUrl.hostname.split(".")
      if (hostParts.length >= 2 && hostParts[0] === "s3") {
        region = hostParts[1]
      }
    } catch {
      // Usar região padrão se não conseguir extrair
    }

    console.log("[B2] Creating S3 client with:", {
      endpoint: config.endpoint,
      region,
      keyIdPrefix: config.keyId.substring(0, 10) + "...",
    })

    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: region,
      credentials: {
        accessKeyId: config.keyId,
        secretAccessKey: config.key,
      },
      forcePathStyle: true, // Importante para Backblaze B2
    })
  }
  return s3Client
}

/**
 * Gera uma chave única para o arquivo no B2
 */
export function generateFileKey(
  tipoDocumento: "factura" | "cotacao" | "carta",
  documentoId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
  return `documentos/${tipoDocumento}/${documentoId}/${timestamp}-${sanitizedFileName}`
}

/**
 * Faz upload de um arquivo para o Backblaze B2
 */
export async function uploadToB2(
  fileKey: string,
  fileBuffer: Buffer | Uint8Array,
  contentType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getB2Config()
    
    // Converter para Uint8Array se for Buffer (melhor compatibilidade)
    const body = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer)
    const contentLength = body.length
    
    // Log para debug
    console.log("[B2] Iniciando upload:", {
      fileKey,
      contentLength,
      contentType,
      bucket: config.bucketName,
      bodyType: body.constructor.name,
    })

    // Verificar se tem conteúdo
    if (contentLength === 0) {
      return { success: false, error: "Arquivo vazio" }
    }

    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: fileKey,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    })

    const result = await createS3Client().send(command)
    console.log("[B2] Upload concluído:", result.$metadata)
    return { success: true }
  } catch (error) {
    console.error("[B2] Erro no upload:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
    // Log detalhado do erro
    if (error instanceof Error && 'Code' in error) {
      console.error("[B2] Código do erro:", (error as unknown as { Code: string }).Code)
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Gera uma URL assinada para download do arquivo (válida por 1 hora)
 */
export async function getDownloadUrl(fileKey: string, expiresIn = 3600): Promise<string | null> {
  try {
    const config = getB2Config()
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: fileKey,
    })

    const signedUrl = await getSignedUrl(createS3Client(), command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("[B2] Erro ao gerar URL de download:", error)
    return null
  }
}

/**
 * Gera uma URL assinada para UPLOAD direto do browser (válida por 10 minutos)
 * Isto permite uploads sem passar pelo servidor Vercel (evita limite de 4.5MB)
 */
export async function getUploadUrl(
  fileKey: string,
  contentType: string,
  expiresIn = 600
): Promise<{ url: string; fileKey: string } | null> {
  try {
    const config = getB2Config()
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: fileKey,
      ContentType: contentType,
    })

    const signedUrl = await getSignedUrl(createS3Client(), command, { expiresIn })
    return { url: signedUrl, fileKey }
  } catch (error) {
    console.error("[B2] Erro ao gerar URL de upload:", error)
    return null
  }
}

/**
 * Deleta um arquivo do Backblaze B2
 */
export async function deleteFromB2(fileKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getB2Config()
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: fileKey,
    })

    await createS3Client().send(command)
    return { success: true }
  } catch (error) {
    console.error("[B2] Erro ao deletar:", error)
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }
  }
}
