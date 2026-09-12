import { describe, expect, it } from "vitest";

import { apurarFGTS } from "../fgts";
import { apurar } from "../motor";
import { estadoInicial, exemplo, normalizarRascunho } from "../rascunho";
import type { Parametros } from "../tipos";

const HOJE = "2026-09-12";

describe("rascunho gravado por versão antiga", () => {
  it("repõe o modo dos juros que a versão da manhã de 11/09 não gravava", () => {
    // Formato real que ficou salvo nos navegadores antes da taxa legal existir.
    const antigo = {
      dataApuracao: "2026-09-12",
      identificacao: {
        empresa: "X",
        cnpj: "11.222.333/0001-81",
        empregado: "Teste Antigo",
        cargo: "Y",
        responsavel: "",
        baseSalarial: "liquido",
        observacoes: "",
      },
      juros: { ativo: true, taxaMesPct: 1, fundamento: "art. 39 da Lei 8.177/1991" },
      multa: { ativa: false, tipo: "percentual", valor: 10, base: "atraso", clausula: "", tetoPercentual: null },
      correcao: { ativa: false, modo: "indice", indice: "IPCA", percentualManual: 0 },
      regiao: "sp-capital",
      bancarios: true,
      sabadoEhUtil: true,
      feriadosLocais: [],
      salarios: [{ id: "a", mes: "2026-07", valor: 300000, pagamentos: [] }],
      ferias: [],
      decimos: [],
      fgtsAtivo: false,
      fgts: [],
    };
    const estado = normalizarRascunho(antigo, HOJE)!;
    expect(estado.juros.modo).toBe("fixa");
    expect(estado.juros.serie).toEqual({});
    expect(estado.juros.taxaMesPct).toBe(1);
    expect(estado.clausulasSalvas).toEqual([]);
    expect(estado.salarios[0]!.valor).toBe(300000);
  });

  it("descarta tipo errado sem derrubar o resto", () => {
    const estado = normalizarRascunho(
      {
        dataApuracao: "não é data",
        juros: { ativo: "sim", modo: "aleatorio", taxaMesPct: "um" },
        multa: { ativa: true, tipo: "inexistente", valor: null },
        regiao: "marte",
        salarios: [{ id: 7, mes: "2026-13", valor: "300", pagamentos: "x" }, "lixo"],
        ferias: "nenhuma",
        fgts: [{ mes: "2026-01", remuneracao: 100, recolhimento: "2026-02-30" }],
      },
      HOJE,
    )!;
    expect(estado.dataApuracao).toBe(HOJE);
    expect(estado.juros).toMatchObject({ ativo: true, modo: "fixa", taxaMesPct: 1 });
    expect(estado.multa.tipo).toBe("percentual");
    expect(estado.regiao).toBe("sp-capital");
    expect(estado.salarios).toHaveLength(1);
    expect(estado.salarios[0]!.mes).toBe("");
    expect(estado.salarios[0]!.valor).toBeNull();
    expect(estado.salarios[0]!.pagamentos).toEqual([]);
    expect(estado.ferias).toEqual([]);
    expect(estado.fgts[0]!.recolhimento).toBe("");
  });

  it("guarda a convenção verificada só enquanto ela existir no módulo", () => {
    const base = JSON.parse(JSON.stringify(estadoInicial(HOJE)));
    const comConvencao = normalizarRascunho(
      {
        ...base,
        multa: {
          ...base.multa,
          ativa: true,
          tipo: "percentualDia",
          valor: 2,
          tetoPercentual: 20,
          convencaoId: "sindpd-seprosp-2026-2027",
        },
      },
      HOJE,
    )!;
    expect(comConvencao.multa.tipo).toBe("percentualDia");
    expect(comConvencao.multa.convencaoId).toBe("sindpd-seprosp-2026-2027");

    const removida = normalizarRascunho(
      { ...base, multa: { ...base.multa, convencaoId: "cct-que-saiu-do-app" } },
      HOJE,
    )!;
    expect(removida.multa.convencaoId).toBeUndefined();
  });

  it("devolve null para o que não é objeto", () => {
    expect(normalizarRascunho(null, HOJE)).toBeNull();
    expect(normalizarRascunho("texto", HOJE)).toBeNull();
    expect(normalizarRascunho(42, HOJE)).toBeNull();
  });

  it("um estado inicial passa pelo normalizador sem mudar", () => {
    const inicial = estadoInicial(HOJE);
    expect(normalizarRascunho(JSON.parse(JSON.stringify(inicial)), HOJE)).toEqual(inicial);
  });

  it("o exemplo vem completo, com identificação válida", () => {
    const e = exemplo(HOJE);
    expect(e.identificacao.empregado).not.toBe("");
    expect(e.identificacao.cnpj).toBe("11.222.333/0001-81");
    expect(e.salarios).toHaveLength(2);
  });
});

describe("datas inválidas não viram NaN", () => {
  const parametros: Parametros = {
    dataApuracao: "",
    juros: { ativo: true, modo: "fixa", taxaMesPct: 1, serie: {}, fundamento: "x" },
    multa: { ativa: false, tipo: "percentual", valor: 0, base: "atraso", clausula: "", tetoPercentual: null },
    correcao: { ativa: false, modo: "indice", indice: "IPCA", percentualManual: 0, serie: {} },
    calendario: { regiao: "sp-capital", bancarios: true, sabadoEhUtil: true, locais: [], locaisManuais: [] },
    identificacao: { empresa: "", cnpj: "", empregado: "", cargo: "", responsavel: "", baseSalarial: "liquido", observacoes: "" },
  };

  it("o motor recusa data de apuração vazia em vez de calcular NaN", () => {
    expect(() =>
      apurar([{ id: "c", ano: 2026, mes: 1, salarioCentavos: 300_000, pagamentos: [] }], parametros),
    ).toThrow(/Data inválida/);
  });

  it("o motor recusa pagamento com data inválida", () => {
    expect(() =>
      apurar(
        [{ id: "c", ano: 2026, mes: 1, salarioCentavos: 300_000, pagamentos: [{ id: "p", data: "2026-02-30", valorCentavos: 1 }] }],
        { ...parametros, dataApuracao: "2026-03-06" },
      ),
    ).toThrow(/Data inválida/);
  });

  it("o FGTS recusa data vazia em vez de cobrar multa sobre NaN", () => {
    expect(() => apurarFGTS(2026, 1, 300_000, { dataApuracao: "" })).toThrow(/Data inválida/);
  });
});
