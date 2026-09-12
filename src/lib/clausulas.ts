/**
 * Modelos de cláusula de multa por atraso de salário.
 *
 * O que existe aqui são FORMATOS que se repetem nas convenções coletivas, não
 * cláusulas de convenções específicas. São milhares de convenções no país,
 * renovadas todo ano, e uma cláusula errada num documento que serve de
 * evidência é pior do que nenhuma. Por isso o modelo preenche o cálculo, mas
 * a identificação da convenção continua sendo digitada por quem calcula. Já a
 * cláusula que a pessoa salvou uma vez volta inteira com um clique.
 */

import type { ConfigMulta } from "./tipos";

export type FormatoDeMulta = Pick<ConfigMulta, "tipo" | "valor" | "base" | "tetoPercentual">;

export interface ModeloDeClausula {
  id: string;
  nome: string;
  descricao: string;
  formato: FormatoDeMulta;
}

export const MODELOS_DE_CLAUSULA: ModeloDeClausula[] = [
  {
    id: "salario-dia",
    nome: "1/30 do salário por dia de atraso",
    descricao: "Um salário-dia para cada dia além do prazo. É o formato mais frequente.",
    formato: { tipo: "salarioDia", valor: 1, base: "atraso", tetoPercentual: null },
  },
  {
    id: "salario-dia-teto",
    nome: "1/30 do salário por dia, limitado a um salário",
    descricao: "Igual ao anterior, mas a multa nunca passa do valor do salário do mês.",
    formato: { tipo: "salarioDia", valor: 1, base: "atraso", tetoPercentual: 100 },
  },
  {
    id: "pct-2-atraso",
    nome: "2% sobre o valor pago com atraso",
    descricao: "Percentual fixo, aplicado uma vez sobre o que foi pago fora do prazo.",
    formato: { tipo: "percentual", valor: 2, base: "atraso", tetoPercentual: null },
  },
  {
    id: "pct-10-atraso",
    nome: "10% sobre o valor pago com atraso",
    descricao: "Percentual fixo, aplicado uma vez sobre o que foi pago fora do prazo.",
    formato: { tipo: "percentual", valor: 10, base: "atraso", tetoPercentual: null },
  },
  {
    id: "pct-5-salario",
    nome: "5% do salário do mês",
    descricao: "Percentual sobre o salário inteiro da competência, pago ou não.",
    formato: { tipo: "percentual", valor: 5, base: "salario", tetoPercentual: null },
  },
  {
    id: "pct-10-salario",
    nome: "10% do salário do mês",
    descricao: "Percentual sobre o salário inteiro da competência, pago ou não.",
    formato: { tipo: "percentual", valor: 10, base: "salario", tetoPercentual: null },
  },
  {
    id: "fixo",
    nome: "Valor fixo por competência em atraso",
    descricao: "Um valor em reais por mês atrasado. Informe o valor no campo abaixo.",
    formato: { tipo: "fixo", valor: 0, base: "atraso", tetoPercentual: null },
  },
];

export function modeloPorId(id: string): ModeloDeClausula | undefined {
  return MODELOS_DE_CLAUSULA.find((m) => m.id === id);
}

/** Dois formatos são o mesmo quando batem em tipo, valor, base e teto. */
export function mesmoFormato(a: FormatoDeMulta, b: FormatoDeMulta): boolean {
  return (
    a.tipo === b.tipo &&
    a.valor === b.valor &&
    a.base === b.base &&
    (a.tetoPercentual ?? null) === (b.tetoPercentual ?? null)
  );
}
