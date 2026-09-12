/**
 * Tabelas tributárias vigentes em 2026, usadas apenas no auxiliar que estima o
 * valor líquido a partir do bruto. O cálculo da mora em si trabalha com o valor
 * que o empregado tinha a receber, informado por quem calcula.
 *
 * INSS: Portaria Interministerial MPS/MF nº 13, de 9 de janeiro de 2026.
 * IRRF: tabela mensal de 2026 e o redutor da Lei 15.270/2025.
 * Salário mínimo: Decreto 12.797/2025.
 */

import { arredondar, type Centavos } from "./dinheiro";

export const SALARIO_MINIMO_2026: Centavos = 162_100;
export const TETO_INSS_2026: Centavos = 847_555;
export const DEDUCAO_DEPENDENTE_2026: Centavos = 18_959;
export const DESCONTO_SIMPLIFICADO_2026: Centavos = 60_720;

/**
 * Alíquotas em milésimos e contas em inteiros. Somar "parcela x 0,075" em
 * ponto flutuante deixava 2.731 valores de remuneração um centavo abaixo do
 * arredondamento meio-para-cima, exatamente nos casos de meio centavo exato.
 */
interface Faixa {
  ate: Centavos;
  /** 75 = 7,5% */
  milesimos: number;
}

/** Faixas progressivas do INSS: a alíquota incide só sobre a parcela da faixa. */
const FAIXAS_INSS: Faixa[] = [
  { ate: 162_100, milesimos: 75 },
  { ate: 290_284, milesimos: 90 },
  { ate: 435_427, milesimos: 120 },
  { ate: TETO_INSS_2026, milesimos: 140 },
];

/** Tabela mensal do IRRF de 2026, com a parcela a deduzir de cada faixa. */
const FAIXAS_IRRF: { ate: Centavos; milesimos: number; deduzir: Centavos }[] = [
  { ate: 242_880, milesimos: 0, deduzir: 0 },
  { ate: 282_665, milesimos: 75, deduzir: 18_216 },
  { ate: 375_105, milesimos: 150, deduzir: 39_416 },
  { ate: 466_468, milesimos: 225, deduzir: 67_549 },
  { ate: Number.POSITIVE_INFINITY, milesimos: 275, deduzir: 90_873 },
];

/** Contribuição previdenciária do empregado sobre a remuneração do mês. */
export function inss2026(remuneracao: Centavos): Centavos {
  if (!Number.isFinite(remuneracao)) return 0;
  const base = Math.min(Math.max(0, Math.round(remuneracao)), TETO_INSS_2026);
  let anterior = 0;
  let totalEmMilesimos = 0;
  for (const faixa of FAIXAS_INSS) {
    if (base <= anterior) break;
    const parcela = Math.min(base, faixa.ate) - anterior;
    totalEmMilesimos += parcela * faixa.milesimos;
    anterior = faixa.ate;
  }
  return arredondar(totalEmMilesimos / 1000);
}

/** Imposto pela tabela, antes do redutor da Lei 15.270/2025. */
export function irrfPelaTabela(base: Centavos): Centavos {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const inteira = Math.round(base);
  const faixa = FAIXAS_IRRF.find((f) => inteira <= f.ate)!;
  return Math.max(0, arredondar((inteira * faixa.milesimos) / 1000 - faixa.deduzir));
}

/**
 * Redutor mensal da Lei 15.270/2025, em vigor desde janeiro de 2026: zera o
 * imposto até R$ 5.000,00 de rendimento e decresce de forma linear até R$
 * 7.350,00. O coeficiente 0,133145 vira 133.145 milionésimos para a conta
 * ficar inteira.
 */
export function redutorLei15270(rendimentoMensal: Centavos): Centavos {
  if (!Number.isFinite(rendimentoMensal)) return 0;
  const renda = Math.round(rendimentoMensal);
  if (renda <= 500_000) return 31_289;
  if (renda > 735_000) return 0;
  return Math.max(0, arredondar((97_862 * 1_000_000 - 133_145 * renda) / 1_000_000));
}

export interface EstimativaLiquido {
  brutoCentavos: Centavos;
  inssCentavos: Centavos;
  baseIrrfCentavos: Centavos;
  irrfPelaTabelaCentavos: Centavos;
  redutorCentavos: Centavos;
  irrfCentavos: Centavos;
  liquidoCentavos: Centavos;
  usouDescontoSimplificado: boolean;
}

/**
 * Estimativa do salário líquido de um mês, considerando apenas INSS e imposto
 * de renda. Não entra aqui vale-transporte, plano de saúde, adiantamento,
 * pensão alimentícia ou qualquer outro desconto do contracheque.
 */
export function estimarLiquido(bruto: Centavos, dependentes = 0): EstimativaLiquido {
  const brutoSeguro = Math.max(0, arredondar(bruto));
  const inss = inss2026(brutoSeguro);
  const baseLegal = Math.max(0, brutoSeguro - inss - dependentes * DEDUCAO_DEPENDENTE_2026);
  const baseSimplificada = Math.max(0, brutoSeguro - DESCONTO_SIMPLIFICADO_2026);
  const usouDescontoSimplificado = baseSimplificada < baseLegal;
  const base = usouDescontoSimplificado ? baseSimplificada : baseLegal;
  const imposto = irrfPelaTabela(base);
  const redutor = redutorLei15270(brutoSeguro);
  const irrf = Math.max(0, imposto - redutor);
  return {
    brutoCentavos: brutoSeguro,
    inssCentavos: inss,
    baseIrrfCentavos: base,
    irrfPelaTabelaCentavos: imposto,
    redutorCentavos: Math.min(redutor, imposto),
    irrfCentavos: irrf,
    liquidoCentavos: brutoSeguro - inss - irrf,
    usouDescontoSimplificado,
  };
}
