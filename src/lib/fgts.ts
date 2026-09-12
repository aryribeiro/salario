/**
 * Encargos do FGTS recolhido fora do prazo.
 *
 * Lei 8.036/1990, art. 15: o empregador deposita 8% da remuneração paga ou
 * devida no mês anterior. O fato gerador é a remuneração DEVIDA — atrasar o
 * pagamento do salário não adia o depósito.
 *
 * Prazo: dia 20 do mês seguinte (redação da Lei 14.438/2022). Quando o dia 20
 * não tem expediente bancário, o recolhimento antecipa para o dia útil anterior.
 *
 * Art. 22: o recolhimento em atraso sofre juros de mora de 0,5% ao mês ou
 * fração, multa de 5% no mês do vencimento e de 10% a partir do mês seguinte,
 * além da atualização pela TR. A TR não é calculada aqui, e o memorial diz
 * isso: seu valor depende de série diária e o efeito é pequeno diante dos
 * demais encargos.
 */

import {
  chaveMesDaData,
  diferencaEmDias,
  ehDataISO,
  paraISO,
  paraUTC,
  type DataISO,
} from "./data";
import { arredondar, type Centavos } from "./dinheiro";
import { mapaDeFeriados } from "./feriados";

export const ALIQUOTA_FGTS = 0.08;
export const ALIQUOTA_FGTS_APRENDIZ = 0.02;

/** Vencimento do depósito: dia 20 do mês seguinte, antecipado se não for dia bancário. */
export function vencimentoFGTS(
  anoCompetencia: number,
  mesCompetencia: number,
  feriadosLocais: { data: DataISO; nome?: string }[] = [],
): DataISO {
  const ano = mesCompetencia === 12 ? anoCompetencia + 1 : anoCompetencia;
  const mes = mesCompetencia === 12 ? 1 : mesCompetencia + 1;
  const feriados = mapaDeFeriados(ano, { bancarios: true, locais: feriadosLocais });
  let dia = 20;
  while (dia > 1) {
    const data = paraISO(ano, mes, dia);
    const semana = paraUTC(data).getUTCDay();
    const ehBancario = semana !== 0 && semana !== 6 && !feriados.has(data);
    if (ehBancario) return data;
    dia -= 1;
  }
  return paraISO(ano, mes, 1);
}

/**
 * Quantos meses, contados do vencimento, já começaram até a data final. Do
 * dia 20/02 ao dia 20/03 é um mês; em 21/03 começa o segundo.
 */
export function mesesIniciadosDesde(vencimento: DataISO, ate: DataISO): number {
  if (ate <= vencimento) return 0;
  const [ano, mes, dia] = vencimento.split("-").map(Number);
  for (let k = 1; k <= 1200; k += 1) {
    const totalMeses = mes! - 1 + k;
    const anoAlvo = ano! + Math.floor(totalMeses / 12);
    const mesAlvo = (totalMeses % 12) + 1;
    const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo, 0)).getUTCDate();
    const aniversario = paraISO(anoAlvo, mesAlvo, Math.min(dia!, ultimoDia));
    if (ate <= aniversario) return k;
  }
  return 1200;
}

export interface EncargoFGTS {
  competencia: string;
  vencimento: DataISO;
  baseCentavos: Centavos;
  depositoCentavos: Centavos;
  diasAtraso: number;
  mesesOuFracao: number;
  jurosCentavos: Centavos;
  multaCentavos: Centavos;
  percentualMulta: number;
  totalCentavos: Centavos;
  recolhido: boolean;
}

export interface ParametrosFGTS {
  /** Data em que o depósito foi feito. Vazio significa ainda não recolhido. */
  dataRecolhimento?: DataISO;
  dataApuracao: DataISO;
  aprendiz?: boolean;
  feriadosLocais?: { data: DataISO; nome?: string }[];
}

export function apurarFGTS(
  anoCompetencia: number,
  mesCompetencia: number,
  remuneracaoCentavos: Centavos,
  parametros: ParametrosFGTS,
): EncargoFGTS {
  const vencimento = vencimentoFGTS(
    anoCompetencia,
    mesCompetencia,
    parametros.feriadosLocais ?? [],
  );
  const aliquota = parametros.aprendiz ? ALIQUOTA_FGTS_APRENDIZ : ALIQUOTA_FGTS;
  const deposito = arredondar(Math.max(0, remuneracaoCentavos) * aliquota);
  const dataFinal = parametros.dataRecolhimento || parametros.dataApuracao;
  if (!ehDataISO(dataFinal)) {
    throw new Error(`Data inválida na apuração do FGTS: "${dataFinal}".`);
  }
  const dias = Math.max(0, diferencaEmDias(vencimento, dataFinal));
  // "Por mês ou fração" contado do vencimento: cada mês que começa a correr
  // depois da data de vencimento conta inteiro, mesmo que só um dia dele
  // tenha sido usado. Antes o cálculo usava blocos de 30 dias, que perdiam a
  // fração quando o mês seguinte já tinha começado.
  const mesesOuFracao = dias > 0 ? mesesIniciadosDesde(vencimento, dataFinal) : 0;
  const juros = dias > 0 ? arredondar(deposito * 0.005 * mesesOuFracao) : 0;
  // 5% dentro do mês do vencimento; 10% a partir do mês seguinte.
  const percentualMulta =
    dias <= 0 ? 0 : chaveMesDaData(dataFinal) === chaveMesDaData(vencimento) ? 5 : 10;
  const multa = arredondar(deposito * (percentualMulta / 100));
  return {
    competencia: `${anoCompetencia}-${String(mesCompetencia).padStart(2, "0")}`,
    vencimento,
    baseCentavos: remuneracaoCentavos,
    depositoCentavos: deposito,
    diasAtraso: dias,
    mesesOuFracao,
    jurosCentavos: juros,
    multaCentavos: multa,
    percentualMulta,
    totalCentavos: deposito + juros + multa,
    recolhido: Boolean(parametros.dataRecolhimento),
  };
}
