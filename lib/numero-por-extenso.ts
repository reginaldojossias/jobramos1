/**
 * Converte um valor numerico para texto por extenso em Meticais (MZN)
 * Exemplo: 1044.50 -> "Mil e Quarenta e Quatro Meticais e Cinquenta Centavos"
 */

const unidades = [
  "", "Um", "Dois", "Tres", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove",
  "Dez", "Onze", "Doze", "Treze", "Catorze", "Quinze", "Dezasseis", "Dezassete", "Dezoito", "Dezanove"
]

const dezenas = [
  "", "", "Vinte", "Trinta", "Quarenta", "Cinquenta", "Sessenta", "Setenta", "Oitenta", "Noventa"
]

const centenas = [
  "", "Cento", "Duzentos", "Trezentos", "Quatrocentos", "Quinhentos",
  "Seiscentos", "Setecentos", "Oitocentos", "Novecentos"
]

function converterGrupo(n: number): string {
  if (n === 0) return ""
  if (n === 100) return "Cem"

  let resultado = ""

  const c = Math.floor(n / 100)
  const resto = n % 100

  if (c > 0) {
    resultado = centenas[c]
    if (resto > 0) resultado += " e "
  }

  if (resto < 20) {
    resultado += unidades[resto]
  } else {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    resultado += dezenas[d]
    if (u > 0) resultado += " e " + unidades[u]
  }

  return resultado
}

export function numeroPorExtenso(valor: number): string {
  if (valor === 0) return "Zero Meticais"

  const valorAbs = Math.abs(valor)
  const parteInteira = Math.floor(valorAbs)
  const centavos = Math.round((valorAbs - parteInteira) * 100)

  let resultado = ""

  if (parteInteira === 0) {
    resultado = ""
  } else if (parteInteira === 1) {
    resultado = "Um"
  } else {
    const bilhoes = Math.floor(parteInteira / 1000000000)
    const milhoes = Math.floor((parteInteira % 1000000000) / 1000000)
    const milhares = Math.floor((parteInteira % 1000000) / 1000)
    const resto = parteInteira % 1000

    const partes: string[] = []

    if (bilhoes > 0) {
      partes.push(
        bilhoes === 1
          ? "Um Biliao"
          : converterGrupo(bilhoes) + " Bilioes"
      )
    }

    if (milhoes > 0) {
      partes.push(
        milhoes === 1
          ? "Um Milhao"
          : converterGrupo(milhoes) + " Milhoes"
      )
    }

    if (milhares > 0) {
      partes.push(
        milhares === 1
          ? "Mil"
          : converterGrupo(milhares) + " Mil"
      )
    }

    if (resto > 0) {
      // Usa "e" se ha partes anteriores e resto < 100
      if (partes.length > 0 && resto < 100) {
        partes.push("e " + converterGrupo(resto))
      } else {
        partes.push(converterGrupo(resto))
      }
    }

    resultado = partes.join(", ")
  }

  // Adicionar moeda
  if (parteInteira === 0) {
    resultado = ""
  } else if (parteInteira === 1) {
    resultado += " Metical"
  } else {
    resultado += " Meticais"
  }

  // Adicionar centavos
  if (centavos > 0) {
    const centavosTexto = converterGrupo(centavos)
    if (parteInteira > 0) {
      resultado += " e " + centavosTexto + (centavos === 1 ? " Centavo" : " Centavos")
    } else {
      resultado = centavosTexto + (centavos === 1 ? " Centavo" : " Centavos")
    }
  }

  if (valor < 0) {
    resultado = "Menos " + resultado
  }

  return resultado
}
