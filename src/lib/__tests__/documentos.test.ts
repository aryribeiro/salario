import { describe, expect, it } from "vitest";

import {
  formatarDocumento,
  limparDocumento,
  problemaNoDocumento,
  tipoDeDocumento,
  validarCNPJ,
  validarCPF,
} from "../documentos";

/**
 * O CNPJ alfanumérico "12.ABC.345/01DE-35" é o exemplo publicado pela Receita
 * Federal e pelo Serpro para o novo cálculo. Se o algoritmo daqui reproduz os
 * dois dígitos dele, reproduz o da Receita.
 */

describe("CNPJ numérico", () => {
  it("aceita número com dígito verificador correto", () => {
    expect(validarCNPJ("11222333000181")).toBe(true);
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(validarCNPJ("11222333000182")).toBe(false);
    expect(validarCNPJ("11222333000191")).toBe(false);
  });

  it("recusa tamanho errado e sequência de um caractere só", () => {
    expect(validarCNPJ("1122233300018")).toBe(false);
    expect(validarCNPJ("112223330001811")).toBe(false);
    expect(validarCNPJ("00000000000000")).toBe(false);
    expect(validarCNPJ("11111111111111")).toBe(false);
  });
});

describe("CNPJ alfanumérico, vigente desde 31 de julho de 2026", () => {
  it("valida o exemplo oficial da Receita Federal", () => {
    expect(validarCNPJ("12ABC34501DE35")).toBe(true);
    expect(validarCNPJ("12.ABC.345/01DE-35")).toBe(true);
  });

  it("recusa o mesmo número com dígito trocado", () => {
    expect(validarCNPJ("12ABC34501DE36")).toBe(false);
    expect(validarCNPJ("12ABC34501DE30")).toBe(false);
  });

  it("recusa letra nas duas últimas posições, que continuam numéricas", () => {
    expect(validarCNPJ("12ABC34501DE3A")).toBe(false);
  });

  it("aceita minúscula, porque o registro é o mesmo", () => {
    expect(validarCNPJ("12abc34501de35")).toBe(true);
  });
});

describe("CPF do empregador pessoa física", () => {
  it("aceita CPF válido", () => {
    expect(validarCPF("52998224725")).toBe(true);
    expect(validarCPF("529.982.247-25")).toBe(true);
  });

  it("recusa CPF inválido e repetido", () => {
    expect(validarCPF("52998224724")).toBe(false);
    expect(validarCPF("11111111111")).toBe(false);
    expect(validarCPF("123")).toBe(false);
  });
});

describe("classificação e apresentação", () => {
  it("separa vazio, CPF, CNPJ e inválido", () => {
    expect(tipoDeDocumento("")).toBe("vazio");
    expect(tipoDeDocumento("   ")).toBe("vazio");
    expect(tipoDeDocumento("52998224725")).toBe("cpf");
    expect(tipoDeDocumento("12ABC34501DE35")).toBe("cnpj");
    expect(tipoDeDocumento("123456")).toBe("invalido");
  });

  it("limpa e aplica a máscara conforme o tipo", () => {
    expect(limparDocumento(" 11.222.333/0001-81 ")).toBe("11222333000181");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarDocumento("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
  });

  it("explica o problema em vez de apenas recusar", () => {
    expect(problemaNoDocumento("")).toContain("Informe");
    expect(problemaNoDocumento("123")).toContain("não confere");
    expect(problemaNoDocumento("11222333000181")).toBeNull();
    expect(problemaNoDocumento("52998224725")).toBeNull();
  });
});
