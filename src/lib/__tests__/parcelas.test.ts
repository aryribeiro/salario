import { describe, expect, it } from "vitest";

import { quintoDiaUtil } from "../feriados";
import { apurar } from "../motor";
import {
  calcularRemuneracaoFerias,
  decimoProporcional,
  vencimentoDecimoPrimeira,
  vencimentoDecimoSegunda,
  vencimentoFerias,
} from "../parcelas";
import { feriadosDaRegiao } from "../regiao";
import type { Obrigacao, Parametros } from "../tipos";

const parametros: Parametros = {
  dataApuracao: "2026-03-06",
  juros: {
    ativo: true,
    modo: "fixa",
    taxaMesPct: 1,
    serie: {},
    fundamento: "art. 39, Lei 8.177/1991",
  },
  multa: {
    ativa: false,
    tipo: "percentual",
    valor: 0,
    base: "atraso",
    clausula: "",
    tetoPercentual: null,
  },
  correcao: { ativa: false, modo: "indice", indice: "IPCA", percentualManual: 0, serie: {} },
  calendario: {
    bancarios: true,
    sabadoEhUtil: true,
    locais: [],
    locaisManuais: [],
    regiao: "sp-capital",
  },
  identificacao: {
    empresa: "",
    cnpj: "",
    empregado: "",
    cargo: "",
    responsavel: "",
    baseSalarial: "liquido",
    observacoes: "",
  },
};

describe("férias", () => {
  it("vencem dois dias antes do início do gozo", () => {
    expect(vencimentoFerias("2026-02-10")).toBe("2026-02-08");
    expect(vencimentoFerias("2026-03-01")).toBe("2026-02-27");
  });

  it("soma o terço constitucional à remuneração", () => {
    const r = calcularRemuneracaoFerias(300_000, 30);
    expect(r.feriasCentavos).toBe(300_000);
    expect(r.tercoFeriasCentavos).toBe(100_000);
    expect(r.totalCentavos).toBe(400_000);
  });

  it("vender dez dias não muda o total, muda a composição", () => {
    const r = calcularRemuneracaoFerias(300_000, 20, 10);
    expect(r.feriasCentavos).toBe(200_000);
    expect(r.tercoFeriasCentavos).toBe(66_667);
    expect(r.abonoCentavos).toBe(100_000);
    expect(r.tercoAbonoCentavos).toBe(33_333);
    expect(r.totalCentavos).toBe(400_000);
  });

  it("limita a venda a dez dias e o total a trinta", () => {
    const r = calcularRemuneracaoFerias(300_000, 45, 20);
    expect(r.diasVendidos).toBe(10);
    expect(r.diasDeFerias).toBe(20);
    expect(r.totalCentavos).toBe(400_000);
  });

  it("trinta dias de descanso com dez vendidos viram vinte de descanso, não quarenta pagos", () => {
    // Defeito apontado na auditoria de 12/09: saía 533.333 (40 dias com terço).
    const r = calcularRemuneracaoFerias(300_000, 30, 10);
    expect(r.diasDeFerias).toBe(20);
    expect(r.diasVendidos).toBe(10);
    expect(r.totalCentavos).toBe(400_000);
  });

  it("entrada não numérica não vira NaN", () => {
    const r = calcularRemuneracaoFerias(300_000, Number.NaN, 0);
    expect(r.totalCentavos).toBe(0);
  });
});

describe("décimo terceiro", () => {
  it("a primeira parcela vence em 30 de novembro", () => {
    expect(vencimentoDecimoPrimeira(2026)).toBe("2026-11-30");
  });

  it("a segunda parcela antecipa quando 20 de dezembro cai em fim de semana", () => {
    // 20/12/2026 é domingo e 20/12/2025 é sábado.
    expect(vencimentoDecimoSegunda(2026)).toBe("2026-12-18");
    expect(vencimentoDecimoSegunda(2025)).toBe("2025-12-19");
  });

  it("calcula o proporcional por doze avos", () => {
    expect(decimoProporcional(300_000, 12)).toBe(300_000);
    expect(decimoProporcional(300_000, 7)).toBe(175_000);
    expect(decimoProporcional(300_000, 0)).toBe(0);
  });
});

describe("feriados regionais", () => {
  it("a capital tem 9 de julho e 25 de janeiro", () => {
    const lista = feriadosDaRegiao("sp-capital", [2026]).map((f) => f.data);
    expect(lista).toContain("2026-07-09");
    expect(lista).toContain("2026-01-25");
  });

  it("o interior tem apenas o feriado estadual", () => {
    const lista = feriadosDaRegiao("sp-estado", [2026]).map((f) => f.data);
    expect(lista).toEqual(["2026-07-09"]);
  });

  it("um feriado local no começo do mês empurra o 5º dia útil", () => {
    const sem = quintoDiaUtil(2026, 1).vencimento;
    const com = quintoDiaUtil(2026, 1, {
      locais: [{ data: "2026-02-03", nome: "Feriado municipal fictício" }],
    }).vencimento;
    expect(sem).toBe("2026-02-06");
    // Com o feriado em 3 de fevereiro, a contagem chega ao 5o dia util no
    // sabado, 7 de fevereiro: o sabado conta, o domingo nao.
    expect(com).toBe("2026-02-07");
  });
});

describe("obrigações dentro da apuração geral", () => {
  it("férias pagas em atraso geram juros e entram no total", () => {
    const ferias: Obrigacao = {
      id: "f1",
      tipo: "ferias",
      rotulo: "Férias do período 2024/2025",
      fundamento: "art. 145 da CLT",
      vencimento: "2026-02-08",
      valorDevidoCentavos: 400_000,
      pagamentos: [{ id: "p1", data: "2026-02-28", valorCentavos: 400_000 }],
    };
    const r = apurar([], parametros, { obrigacoes: [ferias] });
    expect(r.obrigacoes).toHaveLength(1);
    const apurada = r.obrigacoes[0]!;
    expect(apurada.pagamentos[0]!.diasAtraso).toBe(20);
    // 400.000 x 1% x 20/30 = 2.666,67 -> 2.667 centavos
    expect(apurada.jurosCentavos).toBe(2_667);
    expect(r.totalGeralCentavos).toBe(2_667);
  });

  it("décimo terceiro não pago acumula juros até a data da apuração", () => {
    const parcela: Obrigacao = {
      id: "d1",
      tipo: "decimoSegunda",
      rotulo: "13º salário de 2025 — 2ª parcela",
      fundamento: "Lei 4.090/1962",
      vencimento: "2025-12-19",
      valorDevidoCentavos: 150_000,
      pagamentos: [],
    };
    const r = apurar([], parametros, { obrigacoes: [parcela] });
    const apurada = r.obrigacoes[0]!;
    expect(apurada.saldoAbertoCentavos).toBe(150_000);
    expect(apurada.diasAtrasoSaldo).toBe(77);
    expect(apurada.jurosCentavos).toBe(3_850);
    expect(r.totalGeralCentavos).toBe(153_850);
  });

  it("obrigação sem valor é descartada", () => {
    const vazia: Obrigacao = {
      id: "x",
      tipo: "ferias",
      rotulo: "sem valor",
      fundamento: "",
      vencimento: "2026-01-01",
      valorDevidoCentavos: 0,
      pagamentos: [],
    };
    expect(apurar([], parametros, { obrigacoes: [vazia] }).obrigacoes).toHaveLength(0);
  });
});
