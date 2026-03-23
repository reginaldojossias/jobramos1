"use client"

import type { Carta } from "@/lib/types"

interface CartaTemplateProps {
  carta: Carta
  showSecondPage?: boolean
}

// Funcao para formatar data
const formatDate = (dateString: string | null) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  const months = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

export function CartaTemplate({ carta, showSecondPage = true }: CartaTemplateProps) {
  return (
    <div className="carta-document" style={{ fontFamily: '"Times New Roman", serif', background: '#ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px' }}>
      {/* Pagina 1 */}
      <div className="carta-page page-1" style={{ 
        width: '210mm', 
        height: '297mm', 
        background: '#fff', 
        position: 'relative', 
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Cabecalho Azul Grafico */}
        <img 
          src="/images/blue-wave-header.png" 
          alt=""
          style={{
            position: 'absolute',
            top: '5mm',
            left: '5mm',
            width: 'calc(100% - 10mm)',
            height: '110px',
            objectFit: 'cover',
            zIndex: 1
          }}
        />
        
        {/* Logo posicionado abaixo do cabecalho */}
        <div style={{
          position: 'absolute',
          top: '140px',
          left: '25mm',
          zIndex: 2
        }}>
          <img 
            src="/images/magic-pro-logo-full.png" 
            alt="Magic Pro Services"
            style={{ width: '280px', display: 'block' }}
          />
        </div>
        
        {/* Marca d'agua centralizada */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          opacity: 0.3,
          zIndex: 0,
          pointerEvents: 'none'
        }}>
          <img 
            src="/images/atom-watermark-new.png" 
            alt=""
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        
        {/* Conteudo */}
        <div style={{
          position: 'relative',
          zIndex: 3,
          padding: '190px 25mm 60px 25mm',
          fontSize: '11pt',
          lineHeight: 1.5,
          color: '#000'
        }}>
          {/* Destinatario */}
          <p style={{ marginBottom: '12px', marginTop: 0 }}>
            <strong>Ao</strong>
          </p>
          <p style={{ marginBottom: '12px', marginTop: 0 }}>
            <strong>{carta.entidade_destinataria}</strong>
          </p>

          {/* Assunto */}
          <p style={{ marginBottom: '12px', marginTop: '20px' }}>
            <strong>Assunto:</strong> Interpelacao extrajudicial
          </p>

          {/* Saudacao */}
          <p style={{ marginBottom: '12px', marginTop: '15px' }}>
            Exmo Senhores,
          </p>

          {/* Introducao */}
          <p style={{ marginBottom: '12px', marginTop: 0, textAlign: 'justify' }}>
            Por procuracao outorgada pela interpelante, a empresa Magic Pro Services, (cuja a copia junta-se em 
            anexo), na qualidade de seus advogados e sob o seu mandato, serve a presente carta para interpelar a 
            V. Excia, nos termos e fundamentos seguintes:
          </p>

          {/* Pontos numerados */}
          <ol style={{ paddingLeft: '20px', margin: 0 }}>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              Entre a interpelante e o {carta.entidade_destinataria} foi celebrado um contrato 
              de prestacao de servicos graficos, <strong>n.o {carta.numero_contrato}</strong>.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              A interpelante forneceu os servicos contratados na totalidade e tempestivamente.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              Foi acordado que a {carta.entidade_destinataria} apos a recepcao dos servicos ira efectuar o pagamento dentro de trinta 
              dias, caso que nao aconteceu ate a data que se grafa a presente carta.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              Nesta senda, a interpelante por diversas vezes aproximou-se para persuadir ao pagamento das 
              facturas em anexo, de forma a poder fazer face aos compromissos assumidos com os fornecedores, 
              e sem sucesso.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              No entanto, passam mais de (05) cinco meses sem que a {carta.entidade_destinataria} nao pagou nenhuma das facturas, 
              assim a interpelante vem, por este meio, solicitar a rapida resolucao deste assunto, procedendo a 
              V. Excia com o pagamento das facturas em anexo.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              E importante recordar que os contratos devem ser pontualmente cumpridos, conforme previsto no 
              artigo 406 do Codigo Civil. Por outro lado, o devedor so fica exonerado da obrigacao mediante 
              cumprimento integral da mesma, nos termos dos artigos 762 e 763, no1, todos do Codigo Civil.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              Assim, diante de todo o acima exposto, cumpre conceder a V. Excia um prazo impreterivel de{" "}
              <strong>{carta.prazo_dias} (quinze) dias</strong>, contados a partir da data da recepcao da presente interpelacao, para que proceda com 
              o pagamento das facturas em anexo.
            </li>
            <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
              A interpelante faz notar que findo este prazo, a falta de oferecimento de qualquer pronunciamento 
              de vossa parte, equivalera a recusa de negociacao, o que determinara o encaminhamento do assunto 
              para as instancias judiciais com vista a reposicao dos deveres violados.
            </li>
          </ol>
        </div>
        
        {/* Rodape */}
        <div style={{
          position: 'absolute',
          bottom: '25mm',
          left: 0,
          width: '100%',
          textAlign: 'center',
          fontSize: '9pt',
          color: '#333',
          zIndex: 5
        }}>
          <p>Av. FPLM No 1710 R/C-2 - +258 879 482 800 - magicproservices0@gmail.com</p>
          <p>Maputo - Mocambique</p>
        </div>
      </div>

      {/* Pagina 2 */}
      {showSecondPage && (
        <div className="carta-page page-2" style={{ 
          width: '210mm', 
          height: '297mm', 
          background: '#fff', 
          position: 'relative', 
          boxShadow: '0 0 10px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          pageBreakBefore: 'always'
        }}>
          {/* Cabecalho Azul Grafico */}
          <img 
            src="/images/blue-wave-header.png" 
            alt=""
            style={{
              position: 'absolute',
              top: '5mm',
              left: '5mm',
              width: 'calc(100% - 10mm)',
              height: '110px',
              objectFit: 'cover',
              zIndex: 1
            }}
          />
          
          {/* Logo posicionado abaixo do cabecalho */}
          <div style={{
            position: 'absolute',
            top: '140px',
            left: '25mm',
            zIndex: 2
          }}>
            <img 
              src="/images/magic-pro-logo-full.png" 
              alt="Magic Pro Services"
              style={{ width: '280px', display: 'block' }}
            />
          </div>
          
          {/* Marca d'agua centralizada - pagina 2 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70%',
            opacity: 0.3,
            zIndex: 0,
            pointerEvents: 'none'
          }}>
            <img 
              src="/images/atom-watermark-new.png" 
              alt=""
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          
          {/* Conteudo pagina 2 */}
          <div style={{
            position: 'relative',
            zIndex: 3,
            padding: '190px 25mm 60px 25mm',
            fontSize: '11pt',
            lineHeight: 1.5,
            color: '#000'
          }}>
            {/* Ponto 9 */}
            <ol start={9} style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '10px', textAlign: 'justify' }}>
                Por uma resolucao extrajudicial celere e nao litigiosa, subscrevemo-nos com elevada estima e 
                consideracao, cientes de que, tendo em conta os criterios de celeridade, eficacia e boa-fe, a nossa 
                exposicao merecera, da vossa parte, atencao e prontidao.
              </li>
            </ol>

            {/* Data - Centralizada */}
            <p style={{ marginTop: '60px', textAlign: 'center' }}>
              {carta.local}, aos {formatDate(carta.data_carta)}
            </p>

            {/* Assinatura - Centralizada */}
            <div style={{ marginTop: '40px', textAlign: 'center' }}>
              <p style={{ fontWeight: 'bold', color: '#1a3a6e' }}>O Advogado</p>
              <div style={{ marginTop: '50px' }}>
                <div style={{ width: '200px', borderTop: '1px solid #666', margin: '0 auto' }} />
                <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#1a3a6e' }}>{carta.nome_advogado}</p>
                <p style={{ fontWeight: 'bold', color: '#1a3a6e' }}>CP {carta.cp_advogado}</p>
              </div>
            </div>
          </div>
          
          {/* Rodape */}
          <div style={{
            position: 'absolute',
            bottom: '25mm',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontSize: '9pt',
            color: '#333',
            zIndex: 5
          }}>
            <p>Av. FPLM No 1710 R/C-2 - +258 879 482 800 - magicproservices0@gmail.com</p>
            <p>Maputo - Mocambique</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Versao HTML pura para geracao de PDF/Email
export function getCartaHTML(carta: Carta, baseUrl: string): string {
  const formatDateHTML = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const months = [
      "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
  }

  return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>Carta - Magic Pro Services</title>
    <style>
        body {
            margin: 0;
            background: #ccc;
            font-family: "Times New Roman", serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            gap: 20px;
        }

        .page {
            width: 210mm;
            height: 297mm;
            background: #fff;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header-graphic {
            position: absolute;
            top: 5mm;
            left: 5mm;
            width: calc(100% - 10mm);
            height: 110px;
            object-fit: cover;
            z-index: 1;
        }

        .logo-section {
            position: absolute;
            top: 140px;
            left: 25mm;
            z-index: 2;
        }

        .logo-section img {
            width: 280px;
            display: block;
        }

        .watermark-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            opacity: 0.3;
            z-index: 0;
            pointer-events: none;
        }

        .watermark-container img {
            width: 100%;
            height: auto;
        }

        .content {
            position: relative;
            z-index: 3;
            padding: 190px 25mm 60px 25mm;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
        }

        .content p {
            margin-bottom: 12px;
            margin-top: 0;
        }

        .content ol {
            padding-left: 20px;
            margin: 0;
        }

        .content ol li {
            margin-bottom: 10px;
            text-align: justify;
        }

        .justify {
            text-align: justify;
        }

        .footer {
            position: absolute;
            bottom: 25mm;
            left: 0;
            width: 100%;
            text-align: center;
            font-size: 9pt;
            color: #333;
            z-index: 5;
        }

        .centered {
            text-align: center;
        }

        .signature {
            margin-top: 40px;
            text-align: center;
        }

        .signature-title {
            font-weight: bold;
            color: #1a3a6e;
        }

        .signature-line {
            width: 200px;
            border-top: 1px solid #666;
            margin: 50px auto 10px;
        }

        .signature-name {
            font-weight: bold;
            color: #1a3a6e;
        }

        @media print {
            body { 
                background: none; 
                padding: 0; 
                margin: 0; 
            }
            .page { 
                box-shadow: none; 
                margin: 0; 
                page-break-after: always; 
            }
            .page:last-child {
                page-break-after: auto;
            }
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    </style>
</head>
<body>
    <!-- Pagina 1 -->
    <div class="page">
        <img src="${baseUrl}/images/blue-wave-header.png" class="header-graphic" alt="Topo">
        
        <div class="logo-section">
            <img src="${baseUrl}/images/magic-pro-logo-full.png" alt="Logo">
        </div>
        
        <div class="watermark-container">
            <img src="${baseUrl}/images/atom-watermark-new.png" alt="Marca D'agua">
        </div>
        
        <div class="content">
            <p><strong>Ao</strong></p>
            <p><strong>${carta.entidade_destinataria}</strong></p>
            
            <p style="margin-top: 20px;"><strong>Assunto:</strong> Interpelacao extrajudicial</p>
            
            <p style="margin-top: 15px;">Exmo Senhores,</p>
            
            <p class="justify">
                Por procuracao outorgada pela interpelante, a empresa Magic Pro Services, (cuja a copia junta-se em 
                anexo), na qualidade de seus advogados e sob o seu mandato, serve a presente carta para interpelar a 
                V. Excia, nos termos e fundamentos seguintes:
            </p>
            
            <ol>
                <li>Entre a interpelante e o ${carta.entidade_destinataria} foi celebrado um contrato de prestacao de servicos graficos, <strong>n.o ${carta.numero_contrato}</strong>.</li>
                <li>A interpelante forneceu os servicos contratados na totalidade e tempestivamente.</li>
                <li>Foi acordado que a ${carta.entidade_destinataria} apos a recepcao dos servicos ira efectuar o pagamento dentro de trinta dias, caso que nao aconteceu ate a data que se grafa a presente carta.</li>
                <li>Nesta senda, a interpelante por diversas vezes aproximou-se para persuadir ao pagamento das facturas em anexo, de forma a poder fazer face aos compromissos assumidos com os fornecedores, e sem sucesso.</li>
                <li>No entanto, passam mais de (05) cinco meses sem que a ${carta.entidade_destinataria} nao pagou nenhuma das facturas, assim a interpelante vem, por este meio, solicitar a rapida resolucao deste assunto, procedendo a V. Excia com o pagamento das facturas em anexo.</li>
                <li>E importante recordar que os contratos devem ser pontualmente cumpridos, conforme previsto no artigo 406 do Codigo Civil. Por outro lado, o devedor so fica exonerado da obrigacao mediante cumprimento integral da mesma, nos termos dos artigos 762 e 763, no1, todos do Codigo Civil.</li>
                <li>Assim, diante de todo o acima exposto, cumpre conceder a V. Excia um prazo impreterivel de <strong>${carta.prazo_dias} (quinze) dias</strong>, contados a partir da data da recepcao da presente interpelacao, para que proceda com o pagamento das facturas em anexo.</li>
                <li>A interpelante faz notar que findo este prazo, a falta de oferecimento de qualquer pronunciamento de vossa parte, equivalera a recusa de negociacao, o que determinara o encaminhamento do assunto para as instancias judiciais com vista a reposicao dos deveres violados.</li>
            </ol>
        </div>
        
        <div class="footer">
            Av. FPLM No 1710 R/C-2 - +258 879 482 800 - magicproservices0@gmail.com<br>
            Maputo - Mocambique
        </div>
    </div>

    <!-- Pagina 2 -->
    <div class="page">
        <img src="${baseUrl}/images/blue-wave-header.png" class="header-graphic" alt="Topo">
        
        <div class="logo-section">
            <img src="${baseUrl}/images/magic-pro-logo-full.png" alt="Logo">
        </div>
        
        <div class="watermark-container">
            <img src="${baseUrl}/images/atom-watermark-new.png" alt="Marca D'agua">
        </div>
        
        <div class="content">
            <ol start="9">
                <li>Por uma resolucao extrajudicial celere e nao litigiosa, subscrevemo-nos com elevada estima e consideracao, cientes de que, tendo em conta os criterios de celeridade, eficacia e boa-fe, a nossa exposicao merecera, da vossa parte, atencao e prontidao.</li>
            </ol>
            
            <p class="centered" style="margin-top: 60px;">
                ${carta.local}, aos ${formatDateHTML(carta.data_carta)}
            </p>
            
            <div class="signature">
                <p class="signature-title">O Advogado</p>
                <div class="signature-line"></div>
                <p class="signature-name">${carta.nome_advogado}</p>
                <p class="signature-name">CP ${carta.cp_advogado}</p>
            </div>
        </div>
        
        <div class="footer">
            Av. FPLM No 1710 R/C-2 - +258 879 482 800 - magicproservices0@gmail.com<br>
            Maputo - Mocambique
        </div>
    </div>
</body>
</html>
`
}
