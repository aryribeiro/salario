import { describe, expect, it } from "vitest";

import { apurarFGTS, vencimentoFGTS } from "../fgts";
import {
  estimarLiquido,
  inss2026,
  irrfPelaTabela,
  redutorLei15270,
  TETO_INSS_2026,
} from "../tributos";

/**
 * Os dois primeiros casos de imposto de renda reproduzem, centavo a centavo, os
 * exemplos publicados pela Receita Federal para a Lei 15.270/2025. O desconto
 * máximo do INSS confere com o valor divulgado para a tabela de 2026.
 */

describe("INSS 2026", () => {
  it("aplica a alíquota de cada faixa só sobre a parcela da faixa", () => {
    expect(inss2026(162_100)).toBe(12_158);
    expect(inss2026(300_000)).toBe(24_860);
  });

  it("trava no teto do salário de contribuição", () => {
    expect(inss2026(TETO_INSS_2026)).toBe(98_809);
    expect(inss2026(1_500_000)).toBe(98_809);
  });

  it("não cobra nada de base zero", () => {
    expect(inss2026(0)).toBe(0);
  });
});

describe("IRRF 2026", () => {
  it("calcula pela tabela mensal", () => {
    // Exemplo da Receita: base de R$ 5.350,40 na faixa de 27,5%.
    expect(irrfPelaTabela(535_040)).toBe(56_263);
    expect(irrfPelaTabela(200_000)).toBe(0);
  });

  it("aplica o redutor da Lei 15.270/2025", () => {
    expect(redutorLei15270(400_000)).toBe(31_289);
    expect(redutorLei15270(600_000)).toBe(17_975);
    expect(redutorLei15270(735_000)).toBe(0);
    expect(redutorLei15270(900_000)).toBe(0);
  });

  it("zera o imposto de quem ganha R$ 4.000,00, como no exemplo oficial", () => {
    const r = estimarLiquido(400_000);
    expect(r.inssCentavos).toBe(36_860);
    expect(r.usouDescontoSimplificado).toBe(true);
    expect(r.baseIrrfCentavos).toBe(339_280);
    expect(r.irrfPelaTabelaCentavos).toBe(11_476);
    expect(r.irrfCentavos).toBe(0);
  });

  it("o líquido nunca supera o bruto", () => {
    const r = estimarLiquido(1_000_000, 2);
    expect(r.liquidoCentavos).toBeLessThan(r.brutoCentavos);
    expect(r.liquidoCentavos).toBeGreaterThan(0);
  });
});

describe("FGTS em atraso", () => {
  it("vence no dia 20 do mês seguinte", () => {
    expect(vencimentoFGTS(2026, 1)).toBe("2026-02-20");
    expect(vencimentoFGTS(2025, 12)).toBe("2026-01-20");
  });

  it("antecipa quando o dia 20 cai em fim de semana", () => {
    // 20 de setembro de 2026 é domingo: antecipa para sexta-feira, dia 18.
    expect(vencimentoFGTS(2026, 8)).toBe("2026-09-18");
  });

  it("cobra 8%, juros de 0,5% por mês ou fração e multa de 10%", () => {
    const r = apurarFGTS(2026, 1, 300_000, { dataApuracao: "2026-04-06" });
    expect(r.depositoCentavos).toBe(24_000);
    expect(r.vencimento).toBe("2026-02-20");
    expect(r.diasAtraso).toBe(45);
    expect(r.mesesOuFracao).toBe(2);
    expect(r.jurosCentavos).toBe(240);
    expect(r.percentualMulta).toBe(10);
    expect(r.multaCentavos).toBe(2_400);
    expect(r.totalCentavos).toBe(26_640);
  });

  it("a multa é de 5% quando o recolhimento ocorre ainda no mês do vencimento", () => {
    const r = apurarFGTS(2026, 1, 300_000, {
      dataApuracao: "2026-03-01",
      dataRecolhimento: "2026-02-25",
    });
    expect(r.percentualMulta).toBe(5);
    expect(r.multaCentavos).toBe(1_200);
    expect(r.mesesOuFracao).toBe(1);
  });

  it("recolhimento no prazo não gera encargo", () => {
    const r = apurarFGTS(2026, 1, 300_000, {
      dataApuracao: "2026-03-01",
      dataRecolhimento: "2026-02-20",
    });
    expect(r.diasAtraso).toBe(0);
    expect(r.jurosCentavos).toBe(0);
    expect(r.multaCentavos).toBe(0);
    expect(r.totalCentavos).toBe(24_000);
  });

  it("aprendiz recolhe 2%", () => {
    const r = apurarFGTS(2026, 1, 300_000, { dataApuracao: "2026-02-20", aprendiz: true });
    expect(r.depositoCentavos).toBe(6_000);
  });
});
