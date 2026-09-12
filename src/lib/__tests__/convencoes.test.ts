import { describe, expect, it } from "vitest";

import { MODELOS_DE_CLAUSULA, mesmoFormato } from "../clausulas";
import {
  CONVENCOES_VERIFICADAS,
  convencaoPorId,
  convencaoVencida,
  mesDentroDaVigencia,
  mesesForaDaVigencia,
} from "../convencoes";
import { ehDataISO } from "../data";

describe("convenções verificadas", () => {
  it("cada entrada tem registro, vigência coerente, texto literal e data de conferência", () => {
    expect(CONVENCOES_VERIFICADAS.length).toBeGreaterThan(0);
    for (const c of CONVENCOES_VERIFICADAS) {
      expect(c.registroMTE).toMatch(/^[A-Z]{2}\d{6}\/\d{4}$/);
      expect(ehDataISO(c.dataRegistro)).toBe(true);
      expect(ehDataISO(c.vigenciaInicio)).toBe(true);
      expect(ehDataISO(c.vigenciaFim)).toBe(true);
      expect(ehDataISO(c.conferidoEm)).toBe(true);
      expect(c.vigenciaInicio < c.vigenciaFim).toBe(true);
      expect(c.clausulaTexto.length).toBeGreaterThan(80);
      expect(c.identificacao).toContain(c.registroMTE);
      expect(c.fontes.length).toBeGreaterThan(0);
      expect(c.enquadramento).toMatch(/atividade principal/i);
    }
  });

  it("a CCT de TI de São Paulo reproduz a cláusula sexta: 2% ao dia, limitada a 20%", () => {
    const c = convencaoPorId("sindpd-seprosp-2026-2027")!;
    expect(c.registroMTE).toBe("SP002635/2026");
    expect(c.dataRegistro).toBe("2026-03-12");
    expect(c.vigenciaInicio).toBe("2026-01-01");
    expect(c.vigenciaFim).toBe("2027-12-31");
    expect(c.formato).toEqual({ tipo: "percentualDia", valor: 2, base: "atraso", tetoPercentual: 20 });
    expect(c.clausulaTexto).toContain("multa de 2% (dois por cento) ao dia, limitada a 20% (vinte por cento)");
    // O formato existe também como modelo genérico, para quem não é de TI.
    const modelo = MODELOS_DE_CLAUSULA.find((m) => mesmoFormato(m.formato, c.formato));
    expect(modelo?.id).toBe("pct-dia-teto");
  });

  it("checa a vigência mês a mês", () => {
    const c = convencaoPorId("sindpd-seprosp-2026-2027")!;
    expect(mesDentroDaVigencia(c, "2026-01")).toBe(true);
    expect(mesDentroDaVigencia(c, "2027-12")).toBe(true);
    expect(mesDentroDaVigencia(c, "2025-12")).toBe(false);
    expect(mesDentroDaVigencia(c, "2028-01")).toBe(false);
    expect(mesesForaDaVigencia(c, ["2026-04", "2025-12", "2025-11", "2025-12"])).toEqual([
      "2025-11",
      "2025-12",
    ]);
    expect(convencaoVencida(c, "2027-12-31")).toBe(false);
    expect(convencaoVencida(c, "2028-01-01")).toBe(true);
  });

  it("id desconhecido devolve nada", () => {
    expect(convencaoPorId("nao-existe")).toBeUndefined();
    expect(convencaoPorId(undefined)).toBeUndefined();
  });
});
