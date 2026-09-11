import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";

import { apurarFGTS } from "../fgts";
import { apurar } from "../motor";
import { gerarMemorial, nomeDoArquivo, sanear } from "../pdf";
import type { Competencia, Obrigacao, Parametros } from "../tipos";

const parametros: Parametros = {
  dataApuracao: "2026-09-11",
  juros: { ativo: true, taxaMesPct: 1, fundamento: "art. 39 da Lei 8.177/1991" },
  multa: {
    ativa: true,
    tipo: "percentual",
    valor: 10,
    base: "atraso",
    clausula: "CCT 2026/2027 dos comerciários de São Paulo, cláusula 15ª",
    tetoPercentual: null,
  },
  correcao: {
    ativa: true,
    modo: "indice",
    indice: "IPCA",
    percentualManual: 0,
    serie: { "2026-06": 0.24, "2026-07": 0.07, "2026-08": -0.32 },
  },
  calendario: {
    bancarios: true,
    sabadoEhUtil: true,
    locais: [],
    locaisManuais: [],
    regiao: "sp-capital",
  },
  identificacao: {
    empresa: "Indústria Ação & Comércio Ltda.",
    cnpj: "12.345.678/0001-90",
    empregado: "José Antônio Gonçalves",
    cargo: "Operador de empilhadeira",
    responsavel: "Gerência de operações",
    baseSalarial: "liquido",
    observacoes: "Cálculo preparado para a reunião com o sindicato.",
  },
};

const competencias: Competencia[] = [
  {
    id: "c1",
    ano: 2026,
    mes: 5,
    salarioCentavos: 412_350,
    pagamentos: [
      { id: "p1", data: "2026-06-05", valorCentavos: 200_000 },
      { id: "p2", data: "2026-06-22", valorCentavos: 212_350 },
    ],
  },
  {
    id: "c2",
    ano: 2026,
    mes: 6,
    salarioCentavos: 412_350,
    pagamentos: [{ id: "p3", data: "2026-07-28", valorCentavos: 150_000 }],
  },
  {
    id: "c3",
    ano: 2026,
    mes: 7,
    salarioCentavos: 412_350,
    pagamentos: [],
  },
];

const obrigacoes: Obrigacao[] = [
  {
    id: "f1",
    tipo: "ferias",
    rotulo: "Férias — período 2024/2025",
    fundamento:
      "Vencimento em 13/07/2026: dois dias antes do início do gozo, em 15/07/2026, conforme o art. 145 da CLT.",
    vencimento: "2026-07-13",
    valorDevidoCentavos: 549_800,
    pagamentos: [{ id: "pf1", data: "2026-08-10", valorCentavos: 300_000 }],
  },
  {
    id: "d1",
    tipo: "decimoSegunda",
    rotulo: "13º salário de 2025 — 2ª parcela",
    fundamento: "Vencimento em 19/12/2025: a segunda parcela vai até 20 de dezembro.",
    vencimento: "2025-12-19",
    valorDevidoCentavos: 206_175,
    pagamentos: [],
  },
];

describe("memorial em PDF", () => {
  it("saneia sem apagar acento e marca o que não cabe na fonte", () => {
    expect(sanear("José Antônio à ação")).toBe("José Antônio à ação");
    expect(sanear("R$ 1.234,56 — só")).toBe("R$ 1.234,56 — só");
    expect(sanear("valor ≥ 10")).toBe("valor >= 10");
    expect(sanear("金額")).toBe("??");
    expect(sanear("quebra\nde linha")).toBe("quebra de linha");
  });

  it("gera um PDF completo, legível e com mais de uma página", async () => {
    const fgts = [
      apurarFGTS(2026, 5, 500_000, { dataApuracao: parametros.dataApuracao }),
      apurarFGTS(2026, 6, 500_000, {
        dataApuracao: parametros.dataApuracao,
        dataRecolhimento: "2026-08-14",
      }),
    ];
    const apuracao = apurar(competencias, parametros, { obrigacoes, fgts });
    const bytes = await gerarMemorial(apuracao);

    expect(bytes.byteLength).toBeGreaterThan(5_000);
    const cabecalho = Buffer.from(bytes.slice(0, 5)).toString("latin1");
    expect(cabecalho).toBe("%PDF-");

    const relido = await PDFDocument.load(bytes);
    expect(relido.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(relido.getTitle()).toContain("José Antônio Gonçalves");

    const destino = join(tmpdir(), "salarium-debitum");
    mkdirSync(destino, { recursive: true });
    writeFileSync(join(destino, "memorial.pdf"), bytes);
  });

  it("corta com reticências o texto que não cabe na coluna", async () => {
    const apuracao = apurar(competencias, parametros, { obrigacoes });
    const bytes = await gerarMemorial(apuracao);
    expect(bytes.byteLength).toBeGreaterThan(5_000);
  });

  it("monta um nome de arquivo seguro a partir do nome do empregado", () => {
    const apuracao = apurar(competencias, parametros);
    expect(nomeDoArquivo(apuracao)).toBe(
      "memorial-mora-salarial-jose-antonio-goncalves-2026-09-11.pdf",
    );
  });

  it("a soma das linhas fecha com o total geral", () => {
    const apuracao = apurar(competencias, parametros, { obrigacoes });
    const soma = [...apuracao.competencias, ...apuracao.obrigacoes].reduce(
      (acc, item) => acc + item.totalDevidoCentavos,
      0,
    );
    expect(soma).toBe(apuracao.totalGeralCentavos);
    expect(
      apuracao.totalSaldoAbertoCentavos +
        apuracao.totalJurosCentavos +
        apuracao.totalMultaCentavos +
        apuracao.totalCorrecaoCentavos,
    ).toBe(apuracao.totalGeralCentavos);
  });
});
