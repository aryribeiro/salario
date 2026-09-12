/**
 * Convenções coletivas VERIFICADAS: entradas conferidas no texto registrado no
 * sistema Mediador do Ministério do Trabalho e Emprego, uma a uma, com a data
 * da conferência. Cada entrada traz o que o memorial precisa para se sustentar
 * como evidência: registro, partes, vigência, abrangência, o texto literal da
 * cláusula de atraso e a interpretação que o motor adota quando o texto é
 * omisso.
 *
 * Regras de manutenção:
 * - Nenhuma entrada entra sem o PDF registrado ter sido lido. Resumo de site
 *   de sindicato não basta.
 * - A vigência é checada contra cada competência do cálculo. Fora dela, a
 *   convenção não é aplicada e a tela avisa.
 * - O enquadramento segue a atividade principal do EMPREGADOR (arts. 511 e 611
 *   da CLT), não o cargo do trabalhador. O texto de `enquadramento` é impresso
 *   na tela e no memorial para o usuário conferir.
 */

import type { ChaveMes, DataISO } from "./data";
import type { FormatoDeMulta } from "./clausulas";

export interface ConvencaoVerificada {
  id: string;
  /** Nome curto para o menu. */
  nome: string;
  /** Categoria e unidade da federação, em linguagem comum. */
  categoria: string;
  uf: string;
  partes: string;
  registroMTE: string;
  dataRegistro: DataISO;
  vigenciaInicio: DataISO;
  vigenciaFim: DataISO;
  /** Cláusula de abrangência, resumida no que importa para o enquadramento. */
  abrangencia: string;
  /** A quem se aplica, dito para leigo. */
  enquadramento: string;
  clausulaNumero: string;
  /** Texto literal da cláusula que institui a multa. */
  clausulaTexto: string;
  /** O que o motor assume onde a cláusula é omissa. Vai para o memorial. */
  interpretacao: string;
  /** Outras cláusulas da mesma convenção que tocam o cálculo. */
  observacoes: string[];
  formato: FormatoDeMulta;
  /** Texto que vai para o campo "convenção que institui a multa". */
  identificacao: string;
  conferidoEm: DataISO;
  fontes: { titulo: string; url: string }[];
}

export const CONVENCOES_VERIFICADAS: ConvencaoVerificada[] = [
  {
    id: "sindpd-seprosp-2026-2027",
    nome: "TI e processamento de dados, SP (SINDPD × SEPROSP, CCT 2026/2027)",
    categoria: "Empregados em empresas de tecnologia da informação e processamento de dados",
    uf: "SP",
    partes:
      "SINDPD-SP (Sindicato dos Empregados em Empresas de Processamento de Dados, Serviços de Computação e Informática do Estado de São Paulo, CNPJ 55.537.666/0001-75) e SEPROSP (Sindicato das Empresas de Processamento de Dados e Serviços de Informática do Estado de São Paulo, CNPJ 54.460.951/0001-72)",
    registroMTE: "SP002635/2026",
    dataRegistro: "2026-03-12",
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2027-12-31",
    abrangencia:
      "Empregados em empresas de processamento de dados, de serviço de computação, de informática, de tecnologia da informação, desenvolvimento de programas de informática, banco de dados, assessoria, consultoria, produtores e licenciadores de software, e-commerce e serviços de informática em geral, inclusive as empresas abrangidas pela Lei 9.317/96, alterada pela Lei 9.732/98, sejam elas privadas ou de economia mista, com abrangência territorial em SP (cláusula segunda).",
    enquadramento:
      "Vale quando a ATIVIDADE PRINCIPAL DA EMPRESA é de tecnologia da informação ou processamento de dados no estado de São Paulo. O cargo do trabalhador não decide: um desenvolvedor contratado por um banco, uma loja ou uma indústria segue a convenção da categoria da empresa, não esta. Confira o CNAE principal no cartão CNPJ da empresa.",
    clausulaNumero: "Cláusula sexta",
    clausulaTexto:
      "Os salários pagos fora do prazo legal e do que estipula a Cláusula \"Adiantamento/Pagamento dos Salários\" da presente CONVENÇÃO COLETIVA DE TRABALHO, serão acrescidos de correção diária, calculada pela variação do IGPM, ou outro índice legal que vier a substituí-lo, do mês trabalhado, além de multa de 2% (dois por cento) ao dia, limitada a 20% (vinte por cento).",
    interpretacao:
      "A cláusula não diz sobre o que incidem o percentual diário e o teto. Este cálculo adota a leitura mais aderente ao texto: 2% por dia de atraso sobre cada valor pago fora do prazo (e sobre o saldo em aberto, até a data da apuração), com a soma limitada a 20% do valor pago em atraso. A correção diária pelo IGP-M não é reproduzida ao pé da letra: a correção monetária, quando ligada, usa o índice mensal escolhido nos critérios; escolha o IGP-M para aproximar-se da cláusula.",
    observacoes: [
      "Cláusula quinta: a empresa PODE adiantar 40% do salário até o dia 20; o complemento vence no 5º dia útil do mês seguinte, o mesmo prazo do art. 459, §1º, da CLT que este cálculo usa.",
      "Cláusula terceira: salários normativos de R$ 2.500,00 (função técnica de informática e help desk), R$ 2.250,00 (digitador, 30 horas) e R$ 1.800,00 (menor função administrativa), vigentes em 01/01/2026.",
    ],
    formato: { tipo: "percentualDia", valor: 2, base: "atraso", tetoPercentual: 20 },
    identificacao:
      "CCT 2026/2027 SINDPD-SP x SEPROSP, registro MTE SP002635/2026, cláusula sexta (atraso no pagamento de salário): multa de 2% ao dia, limitada a 20%",
    conferidoEm: "2026-09-12",
    fontes: [
      {
        titulo: "Texto registrado no Mediador (MTE), registro SP002635/2026",
        url: "http://www3.mte.gov.br/sistemas/mediador/",
      },
      { titulo: "SINDPD-SP: convenção coletiva 2026/2027", url: "https://www.sindpd.org.br/" },
      { titulo: "SEPROSP: convenção coletiva 2026/2027", url: "https://www.seprosp.org.br/" },
    ],
  },
];

export function convencaoPorId(id: string | undefined): ConvencaoVerificada | undefined {
  if (!id) return undefined;
  return CONVENCOES_VERIFICADAS.find((c) => c.id === id);
}

/** "2026-01" está dentro da vigência quando o mês cabe inteiro nela. */
export function mesDentroDaVigencia(convencao: ConvencaoVerificada, mes: ChaveMes): boolean {
  return mes >= convencao.vigenciaInicio.slice(0, 7) && mes <= convencao.vigenciaFim.slice(0, 7);
}

/** Meses do cálculo que a convenção NÃO alcança, em ordem. */
export function mesesForaDaVigencia(convencao: ConvencaoVerificada, meses: ChaveMes[]): ChaveMes[] {
  return [...new Set(meses.filter((m) => !mesDentroDaVigencia(convencao, m)))].sort();
}

/** Uma convenção cuja vigência já terminou não deve ser oferecida como atual. */
export function convencaoVencida(convencao: ConvencaoVerificada, hoje: DataISO): boolean {
  return hoje > convencao.vigenciaFim;
}
