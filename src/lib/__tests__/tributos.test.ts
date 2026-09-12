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
  it("aplica a alíquota de cada faixa só sobre a parcela da faixa, truncando cada faixa", () => {
    // 1.621,00 x 7,5% = 121,575 -> 121,57 (eSocial trunca, não arredonda)
    expect(inss2026(162_100)).toBe(12_157);
    // 121,57 + 115,36 + 11,65
    expect(inss2026(300_000)).toBe(24_858);
  });

  it("confere com um contracheque real de abril de 2026", () => {
    // Salário de R$ 5.200,00 em empresa de TI de São Paulo: INSS de R$ 529,50.
    // 121,57 + 115,36 + 174,17 + 118,40
    expect(inss2026(520_000)).toBe(52_950);
  });

  it("o imposto de renda do mesmo contracheque, com um dependente, é R$ 46,44", () => {
    const r = estimarLiquido(520_000, 1);
    expect(r.inssCentavos).toBe(52_950);
    // base legal 5.200,00 - 529,50 - 189,59 = 4.480,91; simplificada seria 4.592,80
    expect(r.usouDescontoSimplificado).toBe(false);
    expect(r.baseIrrfCentavos).toBe(448_091);
    // 4.480,91 x 22,5% - 675,49 = 332,71; redutor 978,62 - 0,133145 x 5.200 = 286,27
    expect(r.irrfCentavos).toBe(4_644);
    expect(r.liquidoCentavos).toBe(462_406);
  });

  it("o redutor também escapa do ponto flutuante", () => {
    // 978,62 - 0,133145 x 7.000,00 = 46,605 -> 46,61
    expect(redutorLei15270(700_000)).toBe(4_661);
  });

  it("trava no teto do salário de contribuição", () => {
    // 121,57 + 115,36 + 174,17 + 576,97
    expect(inss2026(TETO_INSS_2026)).toBe(98_807);
    expect(inss2026(1_500_000)).toBe(98_807);
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
    // O exemplo da Receita ilustra o INSS com 368,60; pela regra do eSocial,
    // truncando cada faixa, dá 368,58. O desconto simplificado vence de todo
    // jeito e o imposto zera nos dois casos.
    expect(r.inssCentavos).toBe(36_858);
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

  it("mês ou fração conta do vencimento: no dia seguinte ao aniversário começa outro mês", () => {
    // 20/02 a 20/03 é um mês; 21/03 abre o segundo. Blocos de 30 dias diriam 1.
    const noAniversario = apurarFGTS(2026, 1, 300_000, {
      dataApuracao: "2026-04-01",
      dataRecolhimento: "2026-03-20",
    });
    expect(noAniversario.mesesOuFracao).toBe(1);
    const umDiaDepois = apurarFGTS(2026, 1, 300_000, {
      dataApuracao: "2026-04-01",
      dataRecolhimento: "2026-03-21",
    });
    expect(umDiaDepois.mesesOuFracao).toBe(2);
    expect(umDiaDepois.jurosCentavos).toBe(240);
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
