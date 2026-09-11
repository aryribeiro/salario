/**
 * Dinheiro em centavos inteiros.
 *
 * Nenhum valor monetário circula como número decimal dentro do motor. Ponto
 * flutuante somaria 0,01 de erro por linha e o memorial perderia a única coisa
 * que o torna verificável: a soma das linhas fechar com o total.
 */

export type Centavos = number;

/** Arredondamento meio-para-cima, estável para negativos. */
export function arredondar(valor: number): number {
  return valor >= 0 ? Math.round(valor) : -Math.round(-valor);
}

/** Converte reais (number) em centavos inteiros. */
export function paraCentavos(reais: number): Centavos {
  return arredondar(reais * 100);
}

export function paraReais(centavos: Centavos): number {
  return centavos / 100;
}

/**
 * Lê um valor digitado por humano: "1.234,56", "1234,56", "1234.56", "R$ 1.234,56".
 * Devolve null quando não há número reconhecível.
 */
export function lerValorEmCentavos(entrada: string): Centavos | null {
  if (typeof entrada !== "string") return null;
  let texto = entrada.trim().replace(/\s/g, "").replace(/^R\$/i, "");
  if (!texto) return null;
  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");
  if (temVirgula && temPonto) {
    // O separador decimal é o último que aparecer.
    texto = texto.lastIndexOf(",") > texto.lastIndexOf(".")
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto.replace(/,/g, "");
  } else if (temVirgula) {
    texto = texto.replace(",", ".");
  } else if (temPonto) {
    // "1.234" é milhar; "1.23" é decimal.
    const partes = texto.split(".");
    const ultima = partes[partes.length - 1]!;
    if (partes.length > 2 || ultima.length === 3) texto = texto.replace(/\./g, "");
  }
  if (!/^-?\d*\.?\d*$/.test(texto) || texto === "" || texto === "-") return null;
  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;
  return paraCentavos(numero);
}

const FORMATADOR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatarMoeda(centavos: Centavos): string {
  return FORMATADOR.format(paraReais(centavos));
}

/** Igual a formatarMoeda, mas sem o símbolo — para colunas de tabela do PDF. */
export function formatarNumero(centavos: Centavos): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paraReais(centavos));
}

export function formatarPercentual(valor: number, casas = 2): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor)}%`;
}

export function somar(valores: Centavos[]): Centavos {
  return valores.reduce((acc, v) => acc + v, 0);
}
