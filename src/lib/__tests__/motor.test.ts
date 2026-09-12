import { describe, expect, it } from "vitest";

import { diferencaEmDias, intervaloDeMeses } from "../data";
import { lerValorEmCentavos } from "../dinheiro";
import { domingoDePascoa, quintoDiaUtil } from "../feriados";
import { apurar, apurarCompetencia } from "../motor";
import type { Competencia, Parametros } from "../tipos";

/**
 * Os valores esperados deste arquivo foram conferidos à mão, dia a dia, no
 * calendário de 2026, antes de qualquer linha de interface ser escrita.
 *
 * Âncora: 1º de janeiro de 2026 é uma quinta-feira. Páscoa de 2026: 5 de abril.
 */

const parametrosBase: Parametros = {
  dataApuracao: "2026-03-06",
  juros: {
    ativo: true,
    modo: "fixa",
    taxaMesPct: 1,
    serie: {},
    fundamento: "art. 39, Lei 8.177/1991",
  },
  multa: {
    ativa: true,
    tipo: "percentual",
    valor: 10,
    base: "atraso",
    clausula: "CCT 2026, cláusula 12",
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

function competencia(parcial: Partial<Competencia> = {}): Competencia {
  return {
    id: "c1",
    ano: 2026,
    mes: 1,
    salarioCentavos: 300_000,
    pagamentos: [],
    ...parcial,
  };
}

describe("calendário e 5º dia útil", () => {
  it("acha a Páscoa de 2026 em 5 de abril", () => {
    expect(domingoDePascoa(2026)).toBe("2026-04-05");
    expect(domingoDePascoa(2025)).toBe("2025-04-20");
    expect(domingoDePascoa(2024)).toBe("2024-03-31");
  });

  it("janeiro de 2026 vence em 6 de fevereiro (1º de fevereiro é domingo)", () => {
    expect(quintoDiaUtil(2026, 1).vencimento).toBe("2026-02-06");
  });

  it("fevereiro de 2026 vence em 6 de março", () => {
    expect(quintoDiaUtil(2026, 2).vencimento).toBe("2026-03-06");
  });

  it("dezembro de 2025 vence em 7 de janeiro: o feriado de 1º e o domingo saem, o sábado fica", () => {
    expect(quintoDiaUtil(2025, 12).vencimento).toBe("2026-01-07");
  });

  it("sem contar sábado, dezembro de 2025 vence um dia depois", () => {
    expect(quintoDiaUtil(2025, 12, { sabadoEhUtil: false }).vencimento).toBe("2026-01-08");
  });

  it("março de 2026 vence em 7 de abril: a Sexta-feira Santa cai em 3 de abril", () => {
    expect(quintoDiaUtil(2026, 3).vencimento).toBe("2026-04-07");
  });

  it("o Carnaval de 2026 tira 16 e 17 de fevereiro da contagem quando ligado", () => {
    const comCarnaval = quintoDiaUtil(2026, 1, { bancarios: true });
    const semCarnaval = quintoDiaUtil(2026, 1, { bancarios: false });
    // O 5º dia útil de fevereiro é anterior ao Carnaval, então não muda.
    expect(comCarnaval.vencimento).toBe(semCarnaval.vencimento);
    const dias = comCarnaval.calendario.filter((d) => d.ehUtil).map((d) => d.data);
    expect(dias).not.toContain("2026-02-16");
    expect(dias).not.toContain("2026-02-17");
  });

  it("atravessa a virada do ano: competência de dezembro vence em janeiro seguinte", () => {
    expect(quintoDiaUtil(2026, 12).vencimento.startsWith("2027-01")).toBe(true);
  });

  it("conta 29 de fevereiro em ano bissexto", () => {
    expect(diferencaEmDias("2028-02-01", "2028-03-01")).toBe(29);
    expect(diferencaEmDias("2026-02-01", "2026-03-01")).toBe(28);
  });
});

describe("apuração de uma competência", () => {
  it("pagamento único com 14 dias de atraso: juros de 1% ao mês proporcionais", () => {
    const r = apurarCompetencia(
      competencia({
        pagamentos: [{ id: "p1", data: "2026-02-20", valorCentavos: 300_000 }],
      }),
      parametrosBase,
    );
    expect(r.vencimento).toBe("2026-02-06");
    expect(r.pagamentos[0]!.diasAtraso).toBe(14);
    // 300.000 centavos x 1% x 14/30 = 1.400 centavos
    expect(r.jurosCentavos).toBe(1_400);
    expect(r.multaCentavos).toBe(30_000);
    expect(r.saldoAbertoCentavos).toBe(0);
    expect(r.totalDevidoCentavos).toBe(31_400);
  });

  it("pagamento na data do vencimento não gera encargo algum", () => {
    const r = apurarCompetencia(
      competencia({
        pagamentos: [{ id: "p1", data: "2026-02-06", valorCentavos: 300_000 }],
      }),
      parametrosBase,
    );
    expect(r.emAtraso).toBe(false);
    expect(r.quitadaNoPrazo).toBe(true);
    expect(r.totalDevidoCentavos).toBe(0);
  });

  it("adiantamento pago antes do vencimento abate o principal sem gerar encargo", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 200_000,
        pagamentos: [
          { id: "p1", data: "2026-01-30", valorCentavos: 100_000 },
          { id: "p2", data: "2026-02-06", valorCentavos: 100_000 },
        ],
      }),
      parametrosBase,
    );
    expect(r.pagamentos[0]!.situacao).toBe("adiantado");
    expect(r.pagamentos[1]!.situacao).toBe("em dia");
    expect(r.jurosCentavos).toBe(0);
    expect(r.multaCentavos).toBe(0);
    expect(r.totalDevidoCentavos).toBe(0);
  });

  it("pagamento parcial: cada parcela carrega os próprios dias de atraso", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 400_000,
        pagamentos: [
          { id: "p1", data: "2026-02-06", valorCentavos: 150_000 },
          { id: "p2", data: "2026-02-16", valorCentavos: 100_000 },
        ],
      }),
      parametrosBase,
    );
    // p1 em dia; p2 com 10 dias: 100.000 x 1% x 10/30 = 333,33 -> 333
    expect(r.pagamentos[1]!.diasAtraso).toBe(10);
    expect(r.pagamentos[1]!.jurosCentavos).toBe(333);
    // saldo de 150.000 em aberto de 06/02 a 06/03 = 28 dias
    expect(r.saldoAbertoCentavos).toBe(150_000);
    expect(r.diasAtrasoSaldo).toBe(28);
    expect(r.jurosSaldoCentavos).toBe(1_400);
    expect(r.jurosCentavos).toBe(1_733);
    // valor em atraso = 100.000 + 150.000; multa de 10% = 25.000
    expect(r.valorEmAtrasoCentavos).toBe(250_000);
    expect(r.multaCentavos).toBe(25_000);
    expect(r.totalDevidoCentavos).toBe(176_733);
  });

  it("pagamento maior que o devido gera excedente e não gera saldo negativo", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [{ id: "p1", data: "2026-02-06", valorCentavos: 120_000 }],
      }),
      parametrosBase,
    );
    expect(r.saldoAbertoCentavos).toBe(0);
    expect(r.excedenteCentavos).toBe(20_000);
  });

  it("pagamento feito depois de quitar não carrega atraso nem infla a multa", () => {
    // Defeito apontado na auditoria de 12/09: o extra posterior recebia os
    // dias cheios e a multa por salário-dia saía em 933,33 em vez de 133,33.
    const parametros: Parametros = {
      ...parametrosBase,
      multa: { ...parametrosBase.multa, tipo: "salarioDia", valor: 1 },
    };
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [
          { id: "p1", data: "2026-02-06", valorCentavos: 90_000 },
          { id: "p2", data: "2026-02-10", valorCentavos: 10_000 },
          { id: "p3", data: "2026-03-06", valorCentavos: 50_000 },
        ],
      }),
      parametros,
    );
    expect(r.pagamentos[2]!.situacao).toBe("excedente");
    expect(r.pagamentos[2]!.diasAtraso).toBe(0);
    expect(r.pagamentos[2]!.excedenteCentavos).toBe(50_000);
    expect(r.maiorAtrasoDias).toBe(4);
    // salário-dia 3.333,33 x 4 dias
    expect(r.multaCentavos).toBe(13_333);
  });

  it("competência paga em dia com um extra depois continua 'em dia'", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [
          { id: "p1", data: "2026-02-06", valorCentavos: 100_000 },
          { id: "p2", data: "2026-03-06", valorCentavos: 50_000 },
        ],
      }),
      parametrosBase,
    );
    expect(r.quitadaNoPrazo).toBe(true);
    expect(r.maiorAtrasoDias).toBe(0);
    expect(r.totalDevidoCentavos).toBe(0);
  });

  it("multa por salário-dia multiplica o maior atraso da competência", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-02-16", valorCentavos: 300_000 }],
      }),
      {
        ...parametrosBase,
        multa: {
          ativa: true,
          tipo: "salarioDia",
          valor: 1,
          base: "atraso",
          clausula: "CCT 2026, cláusula 12",
          tetoPercentual: null,
        },
      },
    );
    // salário-dia = 300.000/30 = 10.000; 10 dias de atraso = 100.000
    expect(r.maiorAtrasoDias).toBe(10);
    expect(r.multaCentavos).toBe(100_000);
  });

  it("o teto limita a multa ao percentual do salário", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-02-16", valorCentavos: 300_000 }],
      }),
      {
        ...parametrosBase,
        multa: {
          ativa: true,
          tipo: "salarioDia",
          valor: 1,
          base: "atraso",
          clausula: "CCT 2026, cláusula 12",
          tetoPercentual: 20,
        },
      },
    );
    expect(r.multaCentavos).toBe(60_000);
  });

  describe("multa de percentual por dia (CCT de TI de São Paulo: 2% ao dia, teto de 20%)", () => {
    // Caso real de 2026: salário de R$ 5.200,00 da competência abril, numa
    // empresa de TI de São Paulo. Em maio de 2026, 1º é feriado (sexta), 2 é
    // sábado e conta, 3 é domingo: o 5º dia útil cai em 7 de maio (quinta).
    const parametrosTI: Parametros = {
      ...parametrosBase,
      dataApuracao: "2026-06-30",
      multa: {
        ativa: true,
        tipo: "percentualDia",
        valor: 2,
        base: "atraso",
        clausula: "CCT 2026/2027 SINDPD-SP x SEPROSP, cláusula sexta",
        tetoPercentual: 20,
      },
    };
    const abril = (pagamentos: Competencia["pagamentos"]) =>
      competencia({ ano: 2026, mes: 4, salarioCentavos: 520_000, pagamentos });

    it("cobra 2% por dia de atraso sobre o valor pago fora do prazo", () => {
      const r = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-12", valorCentavos: 520_000 }]),
        parametrosTI,
      );
      expect(r.vencimento).toBe("2026-05-07");
      expect(r.maiorAtrasoDias).toBe(5);
      // 5.200,00 x 2% x 5 dias = 520,00
      expect(r.multaCentavos).toBe(52_000);
    });

    it("trava no teto de 20% do valor pago em atraso", () => {
      const r = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-27", valorCentavos: 520_000 }]),
        parametrosTI,
      );
      // 20 dias x 2% = 40%, limitado a 20% de 5.200,00 = 1.040,00
      expect(r.maiorAtrasoDias).toBe(20);
      expect(r.multaCentavos).toBe(104_000);
    });

    it("cada parcela paga com atraso carrega os próprios dias", () => {
      const r = apurarCompetencia(
        abril([
          { id: "p1", data: "2026-05-12", valorCentavos: 260_000 },
          { id: "p2", data: "2026-05-14", valorCentavos: 260_000 },
        ]),
        parametrosTI,
      );
      // 2.600 x 2% x 5 = 260,00; 2.600 x 2% x 7 = 364,00; soma 624,00 < teto 1.040,00
      expect(r.multaCentavos).toBe(62_400);
    });

    it("o saldo em aberto conta os dias até a apuração e o teto segura a soma", () => {
      const r = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-12", valorCentavos: 260_000 }]),
        { ...parametrosTI, dataApuracao: "2026-05-17" },
      );
      // 2.600 x 2% x 5 = 260,00; saldo 2.600 x 2% x 10 = 520,00; soma 780,00 < 1.040,00
      expect(r.diasAtrasoSaldo).toBe(10);
      expect(r.multaCentavos).toBe(78_000);
      const tarde = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-12", valorCentavos: 260_000 }]),
        { ...parametrosTI, dataApuracao: "2026-06-30" },
      );
      // saldo com 54 dias estouraria; teto = 20% de 5.200,00
      expect(tarde.multaCentavos).toBe(104_000);
    });

    it("sobre o salário inteiro, usa o maior atraso da competência", () => {
      const r = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-12", valorCentavos: 520_000 }]),
        { ...parametrosTI, multa: { ...parametrosTI.multa, base: "salario", tetoPercentual: null } },
      );
      expect(r.multaCentavos).toBe(52_000);
    });

    it("competência fora da vigência da convenção fica sem multa, e diz isso", () => {
      const comVigencia: Parametros = {
        ...parametrosTI,
        multa: { ...parametrosTI.multa, vigencia: { inicio: "2026-01-01", fim: "2027-12-31" } },
      };
      const dentro = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-12", valorCentavos: 520_000 }]),
        comVigencia,
      );
      expect(dentro.multaForaDaVigencia).toBe(false);
      expect(dentro.multaCentavos).toBe(52_000);
      const fora = apurarCompetencia(
        competencia({
          ano: 2025,
          mes: 12,
          salarioCentavos: 520_000,
          pagamentos: [{ id: "p1", data: "2026-01-20", valorCentavos: 520_000 }],
        }),
        comVigencia,
      );
      expect(fora.multaForaDaVigencia).toBe(true);
      expect(fora.multaCentavos).toBe(0);
      expect(fora.jurosCentavos).toBeGreaterThan(0);
    });

    it("pago no prazo, não há multa", () => {
      const r = apurarCompetencia(
        abril([{ id: "p1", data: "2026-05-07", valorCentavos: 520_000 }]),
        parametrosTI,
      );
      expect(r.multaCentavos).toBe(0);
    });
  });

  it("multa desligada não entra na conta", () => {
    const r = apurarCompetencia(
      competencia({
        pagamentos: [{ id: "p1", data: "2026-02-20", valorCentavos: 300_000 }],
      }),
      { ...parametrosBase, multa: { ...parametrosBase.multa, ativa: false } },
    );
    expect(r.multaCentavos).toBe(0);
    expect(r.totalDevidoCentavos).toBe(1_400);
  });

  it("competência sem nenhum pagamento acumula juros sobre o salário inteiro", () => {
    const r = apurarCompetencia(competencia({ pagamentos: [] }), parametrosBase);
    expect(r.saldoAbertoCentavos).toBe(300_000);
    expect(r.diasAtrasoSaldo).toBe(28);
    // 300.000 x 1% x 28/30 = 2.800
    expect(r.jurosCentavos).toBe(2_800);
    expect(r.totalDevidoCentavos).toBe(300_000 + 2_800 + 30_000);
  });
});

describe("juros por série mensal (taxa legal do art. 406 do Código Civil)", () => {
  const comSerie = (serie: Record<string, number>): Parametros => ({
    ...parametrosBase,
    // Os pagamentos destes cenários são de março; a apuração precisa vir depois.
    dataApuracao: "2026-04-30",
    juros: {
      ativo: true,
      modo: "serie",
      taxaMesPct: 0,
      serie,
      fundamento: "art. 406 do Código Civil, redação da Lei 14.905/2024",
    },
    multa: { ...parametrosBase.multa, ativa: false },
  });

  it("aplica a taxa de cada mês proporcional aos dias dentro do mês", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-03-10", valorCentavos: 300_000 }],
      }),
      comSerie({ "2026-02": 1, "2026-03": 0.5 }),
    );
    // vencimento 06/02; fevereiro entra com 23 dias de 28, março com 9 de 31
    // 300.000 x 1% x 23/28 = 2.464,29 e 300.000 x 0,5% x 9/31 = 435,48
    expect(r.pagamentos[0]!.diasAtraso).toBe(32);
    expect(r.jurosCentavos).toBe(2_900);
  });

  it("mês curto rende mais por dia que o mês comercial de 30 dias", () => {
    const emSerie = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-03-10", valorCentavos: 300_000 }],
      }),
      comSerie({ "2026-02": 1, "2026-03": 1 }),
    );
    // fevereiro: 300.000 x 1% x 23/28 = 2.464,29
    // março:     300.000 x 1% x  9/31 =   870,97
    expect(emSerie.jurosCentavos).toBe(3_335);

    const emTaxaFixa = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-03-10", valorCentavos: 300_000 }],
      }),
      {
        ...parametrosBase,
        dataApuracao: "2026-04-30",
        multa: { ...parametrosBase.multa, ativa: false },
      },
    );
    // pelo mês comercial: 300.000 x 1% x 32/30 = 3.200
    expect(emTaxaFixa.jurosCentavos).toBe(3_200);
  });

  it("mês sem taxa publicada é sinalizado em vez de virar zero silencioso", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 300_000,
        pagamentos: [{ id: "p1", data: "2026-03-10", valorCentavos: 300_000 }],
      }),
      comSerie({ "2026-02": 1 }),
    );
    expect(r.mesesSemIndice).toContain("2026-03");
    expect(r.jurosCentavos).toBe(2_464);
  });
});

describe("mora só depois do vencimento, e pagamento só depois de acontecer", () => {
  it("competência ainda não vencida aparece a vencer e fica fora do total", () => {
    // Fevereiro/2026 vence em 06/03; apurada em 01/03 ainda não está em mora.
    const r = apurar(
      [competencia({ ano: 2026, mes: 2, salarioCentavos: 300_000, pagamentos: [] })],
      { ...parametrosBase, dataApuracao: "2026-03-01" },
    );
    const c = r.competencias[0]!;
    expect(c.aVencer).toBe(true);
    expect(c.emAtraso).toBe(false);
    expect(c.quitadaNoPrazo).toBe(false);
    expect(c.saldoAbertoCentavos).toBe(300_000);
    expect(c.totalDevidoCentavos).toBe(0);
    expect(r.totalGeralCentavos).toBe(0);
    expect(r.totalAVencerCentavos).toBe(300_000);
    expect(r.competenciasEmAberto).toBe(0);
  });

  it("pagamento datado depois da apuração não quita nem gera juros até lá", () => {
    const r = apurar(
      [
        competencia({
          salarioCentavos: 300_000,
          pagamentos: [{ id: "p", data: "2031-01-15", valorCentavos: 300_000 }],
        }),
      ],
      { ...parametrosBase, multa: { ...parametrosBase.multa, ativa: false } },
    );
    const c = r.competencias[0]!;
    expect(c.pagamentos[0]!.situacao).toBe("futuro");
    expect(c.pagamentos[0]!.valorAplicadoCentavos).toBe(0);
    expect(c.saldoAbertoCentavos).toBe(300_000);
    // juros do saldo de 06/02 a 06/03: 300.000 x 1% x 28/30
    expect(c.jurosCentavos).toBe(2_800);
    expect(r.pagamentosAposApuracao).toBe(1);
  });
});

describe("correção monetária", () => {
  it("juros incidem sobre o valor corrigido, Súmula 200 do TST", () => {
    const r = apurarCompetencia(
      competencia({ salarioCentavos: 100_000, pagamentos: [] }),
      {
        ...parametrosBase,
        dataApuracao: "2026-04-06",
        multa: { ...parametrosBase.multa, ativa: false },
        correcao: {
          ativa: true,
          modo: "indice",
          indice: "IPCA",
          percentualManual: 0,
          serie: { "2026-02": 1, "2026-03": 1 },
        },
      },
    );
    // 06/02 a 06/04 = 59 dias; correção 1,01 x 1,01 = 2.010
    expect(r.correcaoCentavos).toBe(2_010);
    // juros sobre 102.010: x 1% x 59/30 = 2.006,2 -> 2.006
    expect(r.jurosCentavos).toBe(2_006);
  });

  it("acumula a variação mensal informada pela série", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [{ id: "p1", data: "2026-04-10", valorCentavos: 100_000 }],
      }),
      {
        ...parametrosBase,
        // O pagamento é de abril; a apuração precisa vir depois dele.
        dataApuracao: "2026-04-30",
        correcao: {
          ativa: true,
          modo: "indice",
          indice: "IPCA",
          percentualManual: 0,
          serie: { "2026-02": 1, "2026-03": 1 },
        },
      },
    );
    // Vencimento 06/02; meses inteiros vencidos até abril: fevereiro e março.
    // 1,01 x 1,01 = 1,0201 -> 2,01% de 100.000 = 2.010
    expect(r.correcaoCentavos).toBe(2_010);
  });

  it("avisa quais meses ficaram sem índice em vez de inventar número", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [{ id: "p1", data: "2026-04-10", valorCentavos: 100_000 }],
      }),
      {
        ...parametrosBase,
        // O pagamento é de abril; a apuração precisa vir depois dele.
        dataApuracao: "2026-04-30",
        correcao: {
          ativa: true,
          modo: "indice",
          indice: "IPCA",
          percentualManual: 0,
          serie: { "2026-02": 1 },
        },
      },
    );
    expect(r.mesesSemIndice).toEqual(["2026-03"]);
    expect(r.correcaoCentavos).toBe(1_000);
  });

  it("deflação no período não reduz o valor devido", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [{ id: "p1", data: "2026-04-10", valorCentavos: 100_000 }],
      }),
      {
        ...parametrosBase,
        // O pagamento é de abril; a apuração precisa vir depois dele.
        dataApuracao: "2026-04-30",
        correcao: {
          ativa: true,
          modo: "indice",
          indice: "IPCA",
          percentualManual: 0,
          serie: { "2026-02": -0.5, "2026-03": -0.2 },
        },
      },
    );
    expect(r.correcaoCentavos).toBe(0);
  });

  it("percentual informado à mão é aplicado direto sobre o valor em atraso", () => {
    const r = apurarCompetencia(
      competencia({
        salarioCentavos: 100_000,
        pagamentos: [{ id: "p1", data: "2026-02-20", valorCentavos: 100_000 }],
      }),
      {
        ...parametrosBase,
        correcao: {
          ativa: true,
          modo: "manual",
          indice: "IPCA",
          percentualManual: 5,
          serie: {},
        },
      },
    );
    expect(r.correcaoCentavos).toBe(5_000);
  });
});

describe("totais da apuração", () => {
  it("a soma das competências fecha com o total geral", () => {
    const r = apurar(
      [
        competencia({
          id: "a",
          ano: 2025,
          mes: 12,
          salarioCentavos: 250_000,
          pagamentos: [{ id: "p1", data: "2026-01-20", valorCentavos: 250_000 }],
        }),
        competencia({
          id: "b",
          ano: 2026,
          mes: 1,
          salarioCentavos: 250_000,
          pagamentos: [{ id: "p2", data: "2026-02-16", valorCentavos: 100_000 }],
        }),
      ],
      parametrosBase,
    );
    const somaLinhas = r.competencias.reduce((acc, c) => acc + c.totalDevidoCentavos, 0);
    expect(somaLinhas).toBe(r.totalGeralCentavos);
    expect(r.competenciasComAtraso).toBe(2);
    expect(r.competenciasEmAberto).toBe(1);
    expect(r.competencias[0]!.rotulo).toBe("dezembro de 2025");
  });

  it("ordena as competências pela data, mesmo digitadas fora de ordem", () => {
    const r = apurar(
      [
        competencia({ id: "b", ano: 2026, mes: 3 }),
        competencia({ id: "a", ano: 2026, mes: 1 }),
      ],
      parametrosBase,
    );
    expect(r.competencias.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("competência sem valor é descartada", () => {
    const r = apurar([competencia({ salarioCentavos: 0 })], parametrosBase);
    expect(r.competencias).toHaveLength(0);
    expect(r.totalGeralCentavos).toBe(0);
  });
});

describe("leitura de valores digitados", () => {
  it("entende os formatos que uma pessoa realmente digita", () => {
    expect(lerValorEmCentavos("1.234,56")).toBe(123_456);
    expect(lerValorEmCentavos("1234,56")).toBe(123_456);
    expect(lerValorEmCentavos("1234.56")).toBe(123_456);
    expect(lerValorEmCentavos("R$ 1.234,56")).toBe(123_456);
    expect(lerValorEmCentavos("1.234")).toBe(123_400);
    expect(lerValorEmCentavos("3000")).toBe(300_000);
    expect(lerValorEmCentavos("")).toBeNull();
    expect(lerValorEmCentavos("abc")).toBeNull();
  });

  it("terceira casa decimal arredonda meio-para-cima, sem ponto flutuante", () => {
    expect(lerValorEmCentavos("1,005")).toBe(101);
    expect(lerValorEmCentavos("0,285")).toBe(29);
    expect(lerValorEmCentavos("2,004")).toBe(200);
    expect(lerValorEmCentavos(",5")).toBe(50);
    expect(lerValorEmCentavos("1234,")).toBe(123_400);
  });
});

describe("leitura do mês digitado", () => {
  it("aceita o formato do navegador e o formato humano", async () => {
    const { lerChaveMes } = await import("../data");
    expect(lerChaveMes("2026-08")).toBe("2026-08");
    expect(lerChaveMes("08/2026")).toBe("2026-08");
    expect(lerChaveMes("8/2026")).toBe("2026-08");
    expect(lerChaveMes("2026-13")).toBeNull();
    expect(lerChaveMes("13/2026")).toBeNull();
    expect(lerChaveMes("agosto")).toBeNull();
    expect(lerChaveMes("")).toBeNull();
  });
});

describe("intervalos de meses", () => {
  it("atravessa a virada do ano", () => {
    expect(intervaloDeMeses("2025-11", "2026-02")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("devolve vazio quando o fim é anterior ao início", () => {
    expect(intervaloDeMeses("2026-05", "2026-01")).toEqual([]);
  });
});
