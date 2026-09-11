/**
 * Feriados regionais.
 *
 * Direito do trabalho é matéria federal: prazo de pagamento, juros e correção
 * valem igual no país inteiro. O que muda de uma cidade para outra é o
 * calendário de feriados, e isso muda a data do 5º dia útil — logo, muda quantos
 * dias de atraso existem. Por isso a região entra no cálculo.
 *
 * O outro ponto genuinamente local é a convenção coletiva da categoria, que
 * varia por sindicato e região. Ela não cabe em tabela: quem calcula informa a
 * cláusula.
 */

import { paraISO, type DataISO } from "./data";

export type Regiao = "sp-capital" | "sp-estado" | "nenhuma";

export const REGIOES: { valor: Regiao; rotulo: string; descricao: string }[] = [
  {
    valor: "sp-capital",
    rotulo: "São Paulo (capital)",
    descricao: "9 de julho e 25 de janeiro, além dos feriados nacionais",
  },
  {
    valor: "sp-estado",
    rotulo: "Estado de São Paulo (interior)",
    descricao: "9 de julho, além dos feriados nacionais",
  },
  {
    valor: "nenhuma",
    rotulo: "Somente feriados nacionais",
    descricao: "para outras cidades, informe os feriados locais à mão",
  },
];

/** Feriados da região nos anos indicados. */
export function feriadosDaRegiao(regiao: Regiao, anos: number[]): { data: DataISO; nome: string }[] {
  if (regiao === "nenhuma") return [];
  const lista: { data: DataISO; nome: string }[] = [];
  for (const ano of anos) {
    // Lei estadual 9.497/1997: Revolução Constitucionalista de 1932.
    lista.push({ data: paraISO(ano, 7, 9), nome: "Revolução Constitucionalista (feriado estadual)" });
    if (regiao === "sp-capital") {
      // Lei municipal 14.485/2007: aniversário da cidade de São Paulo.
      lista.push({ data: paraISO(ano, 1, 25), nome: "Aniversário da cidade de São Paulo" });
    }
  }
  return lista;
}

export function rotuloDaRegiao(regiao: Regiao): string {
  return REGIOES.find((r) => r.valor === regiao)?.rotulo ?? "Somente feriados nacionais";
}
