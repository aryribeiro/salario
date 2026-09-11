/**
 * CNPJ e CPF do empregador.
 *
 * O memorial identifica quem deve. Um número digitado errado transforma o
 * documento em papel sem valor, por isso aqui ele é conferido pelo dígito
 * verificador, e não só pelo tamanho.
 *
 * Desde 31 de julho de 2026 a Receita Federal emite CNPJ alfanumérico
 * (Instruções Normativas RFB 2.119/2022 e 2.229/2024): as doze primeiras
 * posições aceitam letras e números, e as duas últimas continuam numéricas. O
 * dígito sai do módulo 11 sobre o valor de cada caractere na tabela ASCII menos
 * 48, o que faz o algoritmo antigo virar um caso particular do novo: para um
 * dígito, "7" tem ASCII 55, e 55 menos 48 é 7.
 */

export type TipoDocumento = "vazio" | "cpf" | "cnpj" | "invalido";

/** Deixa apenas letras e números, em maiúsculas. */
export function limparDocumento(entrada: string): string {
  return (entrada ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function valorDoCaractere(caractere: string): number {
  return caractere.charCodeAt(0) - 48;
}

function digitosDoModulo11(base: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i += 1) {
    soma += valorDoCaractere(base[i]!) * pesos[i]!;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function validarCNPJ(entrada: string): boolean {
  const limpo = limparDocumento(entrada);
  if (limpo.length !== 14) return false;
  // As doze primeiras posições aceitam letra ou número; as duas últimas, não.
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(limpo)) return false;
  // Sequência de um caractere só passa no módulo 11 mas não existe na Receita.
  if (/^(.)\1{13}$/.test(limpo)) return false;

  const primeiro = digitosDoModulo11(limpo.slice(0, 12), PESOS_CNPJ_1);
  if (primeiro !== Number(limpo[12])) return false;
  const segundo = digitosDoModulo11(limpo.slice(0, 13), PESOS_CNPJ_2);
  return segundo === Number(limpo[13]);
}

export function validarCPF(entrada: string): boolean {
  const limpo = limparDocumento(entrada);
  if (!/^\d{11}$/.test(limpo) || /^(\d)\1{10}$/.test(limpo)) return false;

  const calcular = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i += 1) soma += Number(limpo[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(limpo[9]) && calcular(10) === Number(limpo[10]);
}

export function tipoDeDocumento(entrada: string): TipoDocumento {
  const limpo = limparDocumento(entrada);
  if (limpo.length === 0) return "vazio";
  if (limpo.length === 11) return validarCPF(limpo) ? "cpf" : "invalido";
  if (limpo.length === 14) return validarCNPJ(limpo) ? "cnpj" : "invalido";
  return "invalido";
}

/** Aplica a máscara conforme o tamanho, sem estorvar quem ainda está digitando. */
export function formatarDocumento(entrada: string): string {
  const limpo = limparDocumento(entrada);
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
  }
  if (limpo.length === 14) {
    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
  }
  return entrada.trim();
}

/** Mensagem para a tela, ou null quando não há o que reclamar. */
export function problemaNoDocumento(entrada: string): string | null {
  switch (tipoDeDocumento(entrada)) {
    case "vazio":
      return "Informe o CNPJ da empresa.";
    case "invalido":
      return "Este número não confere. Verifique o CNPJ, ou informe o CPF do empregador pessoa física.";
    default:
      return null;
  }
}
