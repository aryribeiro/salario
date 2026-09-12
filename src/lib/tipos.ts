import type { DataISO } from "./data";
import type { Centavos } from "./dinheiro";
import type { EncargoFGTS } from "./fgts";
import type { Regiao } from "./regiao";

export interface Pagamento {
  id: string;
  data: DataISO;
  valorCentavos: Centavos;
  descricao?: string;
}

export interface Competencia {
  id: string;
  /** Ano do mês TRABALHADO. */
  ano: number;
  /** Mês TRABALHADO, de 1 a 12. */
  mes: number;
  /** Valor devido da competência, já líquido de descontos legais. */
  salarioCentavos: Centavos;
  pagamentos: Pagamento[];
}

export interface ConfigJuros {
  ativo: boolean;
  /**
   * "fixa" usa a mesma taxa em todo o período. "serie" usa a taxa de cada mês,
   * como exige a taxa legal do art. 406 do Código Civil, que varia conforme a
   * Selic e o IPCA do mês.
   */
  modo: "fixa" | "serie";
  /** Taxa ao mês, em percentual. Juros simples, proporcionais aos dias. */
  taxaMesPct: number;
  /** Taxa mensal em %, por chave "YYYY-MM". Usada quando modo = "serie". */
  serie: Record<string, number>;
  /** Rótulo do fundamento exibido na tela e no PDF. */
  fundamento: string;
}

export type TipoMulta = "percentual" | "fixo" | "salarioDia";

export interface ConfigMulta {
  ativa: boolean;
  tipo: TipoMulta;
  /**
   * percentual: alíquota em % | fixo: valor em centavos |
   * salarioDia: quantos salários-dia por dia de atraso
   */
  valor: number;
  /** Sobre o que a multa incide. */
  base: "atraso" | "salario";
  /** Cláusula da convenção ou acordo coletivo que institui a multa. */
  clausula: string;
  /** Teto opcional, em percentual do salário da competência. */
  tetoPercentual: number | null;
}

export type IndiceCorrecao = "IPCA" | "INPC" | "IGPM";

export interface ConfigCorrecao {
  ativa: boolean;
  modo: "indice" | "manual";
  indice: IndiceCorrecao;
  /** Percentual acumulado informado à mão, usado quando modo = "manual". */
  percentualManual: number;
  /** Variação mensal em %, por chave "YYYY-MM". */
  serie: Record<string, number>;
}

export interface ConfigCalendario {
  /** Região cujos feriados entram na contagem de dias úteis. */
  regiao: Regiao;
  /** Inclui Carnaval e Corpus Christi na apuração do 5º dia útil. */
  bancarios: boolean;
  /** Sábado conta como dia útil. */
  sabadoEhUtil: boolean;
  /** Feriados da região somados aos digitados à mão. Entra no cálculo. */
  locais: { data: DataISO; nome?: string }[];
  /** Só os digitados à mão. Serve para o memorial distinguir a origem. */
  locaisManuais: { data: DataISO; nome?: string }[];
}

export interface Identificacao {
  empresa: string;
  cnpj: string;
  empregado: string;
  cargo: string;
  responsavel: string;
  baseSalarial: "liquido" | "bruto";
  observacoes: string;
}

export interface Parametros {
  dataApuracao: DataISO;
  juros: ConfigJuros;
  multa: ConfigMulta;
  correcao: ConfigCorrecao;
  calendario: ConfigCalendario;
  identificacao: Identificacao;
}

/**
 * "excedente": pagamento feito quando a parcela já estava quitada. Não gera
 * atraso nem encargo; fica registrado para quem lê saber que o dinheiro entrou.
 */
export type SituacaoPagamento = "adiantado" | "em dia" | "atrasado" | "excedente" | "ignorado";

export interface PagamentoApurado {
  id: string;
  data: DataISO;
  valorInformadoCentavos: Centavos;
  valorAplicadoCentavos: Centavos;
  excedenteCentavos: Centavos;
  diasAtraso: number;
  jurosCentavos: Centavos;
  correcaoCentavos: Centavos;
  situacao: SituacaoPagamento;
  descricao?: string;
}

export interface CompetenciaApurada {
  id: string;
  ano: number;
  mes: number;
  rotulo: string;
  salarioCentavos: Centavos;
  vencimento: DataISO;
  diasUteisContados: DataISO[];
  pagamentos: PagamentoApurado[];
  totalPagoCentavos: Centavos;
  excedenteCentavos: Centavos;
  saldoAbertoCentavos: Centavos;
  diasAtrasoSaldo: number;
  jurosSaldoCentavos: Centavos;
  correcaoSaldoCentavos: Centavos;
  valorEmAtrasoCentavos: Centavos;
  jurosCentavos: Centavos;
  multaCentavos: Centavos;
  correcaoCentavos: Centavos;
  encargosCentavos: Centavos;
  totalDevidoCentavos: Centavos;
  maiorAtrasoDias: number;
  emAtraso: boolean;
  quitadaNoPrazo: boolean;
  mesesSemIndice: string[];
}

/** Parcelas que não são salário mensal: férias e décimo terceiro. */
export type TipoObrigacao = "ferias" | "decimoPrimeira" | "decimoSegunda";

export interface Obrigacao {
  id: string;
  tipo: TipoObrigacao;
  /** Nome que aparece na tela e no memorial. */
  rotulo: string;
  /** Regra que define o prazo, escrita para leigo. */
  fundamento: string;
  vencimento: DataISO;
  valorDevidoCentavos: Centavos;
  pagamentos: Pagamento[];
  observacao?: string;
}

export interface ObrigacaoApurada {
  id: string;
  tipo: TipoObrigacao;
  rotulo: string;
  fundamento: string;
  observacao?: string;
  vencimento: DataISO;
  valorDevidoCentavos: Centavos;
  pagamentos: PagamentoApurado[];
  totalPagoCentavos: Centavos;
  excedenteCentavos: Centavos;
  saldoAbertoCentavos: Centavos;
  diasAtrasoSaldo: number;
  jurosSaldoCentavos: Centavos;
  correcaoSaldoCentavos: Centavos;
  valorEmAtrasoCentavos: Centavos;
  jurosCentavos: Centavos;
  multaCentavos: Centavos;
  correcaoCentavos: Centavos;
  encargosCentavos: Centavos;
  totalDevidoCentavos: Centavos;
  maiorAtrasoDias: number;
  emAtraso: boolean;
  quitadaNoPrazo: boolean;
  mesesSemIndice: string[];
}

export interface Apuracao {
  competencias: CompetenciaApurada[];
  obrigacoes: ObrigacaoApurada[];
  totalSalariosCentavos: Centavos;
  totalPagoCentavos: Centavos;
  totalSaldoAbertoCentavos: Centavos;
  totalJurosCentavos: Centavos;
  totalMultaCentavos: Centavos;
  totalCorrecaoCentavos: Centavos;
  totalEncargosCentavos: Centavos;
  totalGeralCentavos: Centavos;
  competenciasComAtraso: number;
  competenciasEmAberto: number;
  maiorAtrasoDias: number;
  mesesSemIndice: string[];
  /** Encargos do FGTS recolhido fora do prazo, quando o módulo está ligado. */
  fgts: EncargoFGTS[];
  totalFgtsDepositoCentavos: Centavos;
  totalFgtsEncargosCentavos: Centavos;
  parametros: Parametros;
  geradoEm: string;
}
