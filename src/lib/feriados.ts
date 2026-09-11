/**
 * Calendário de feriados usado para achar o 5º dia útil do mês.
 *
 * Base legal dos feriados nacionais: Lei 662/1949 e Lei 10.607/2002 (1º de
 * janeiro, 21 de abril, 1º de maio, 7 de setembro, 2 de novembro, 15 de
 * novembro e 25 de dezembro), Lei 6.802/1980 (12 de outubro) e Lei
 * 14.759/2023, que tornou o 20 de novembro feriado nacional a partir de 2024.
 *
 * Carnaval (segunda e terça) e Corpus Christi não são feriados nacionais por
 * lei: são ponto facultativo. Entram por padrão porque os bancos não operam
 * nesses dias e a folha depende de banco — mas ficam em grupo próprio, que o
 * usuário pode desligar.
 */

import { deUTC, paraISO, paraUTC, somarDias, type DataISO } from "./data";

export interface Feriado {
  data: DataISO;
  nome: string;
  tipo: "nacional" | "bancario" | "local";
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function domingoDePascoa(ano: number): DataISO {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return paraISO(ano, mes, dia);
}

export function feriadosNacionais(ano: number): Feriado[] {
  const lista: Feriado[] = [
    { data: paraISO(ano, 1, 1), nome: "Confraternização Universal", tipo: "nacional" },
    { data: paraISO(ano, 4, 21), nome: "Tiradentes", tipo: "nacional" },
    { data: paraISO(ano, 5, 1), nome: "Dia do Trabalho", tipo: "nacional" },
    { data: paraISO(ano, 9, 7), nome: "Independência do Brasil", tipo: "nacional" },
    { data: paraISO(ano, 10, 12), nome: "Nossa Senhora Aparecida", tipo: "nacional" },
    { data: paraISO(ano, 11, 2), nome: "Finados", tipo: "nacional" },
    { data: paraISO(ano, 11, 15), nome: "Proclamação da República", tipo: "nacional" },
    { data: paraISO(ano, 12, 25), nome: "Natal", tipo: "nacional" },
  ];
  if (ano >= 2024) {
    lista.push({
      data: paraISO(ano, 11, 20),
      nome: "Consciência Negra (Lei 14.759/2023)",
      tipo: "nacional",
    });
  }
  const pascoa = domingoDePascoa(ano);
  lista.push({ data: somarDias(pascoa, -2), nome: "Sexta-feira Santa", tipo: "nacional" });
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}

/** Dias sem expediente bancário que não são feriado nacional por lei. */
export function feriadosBancarios(ano: number): Feriado[] {
  const pascoa = domingoDePascoa(ano);
  return [
    { data: somarDias(pascoa, -48), nome: "Carnaval (segunda-feira)", tipo: "bancario" },
    { data: somarDias(pascoa, -47), nome: "Carnaval (terça-feira)", tipo: "bancario" },
    { data: somarDias(pascoa, 60), nome: "Corpus Christi", tipo: "bancario" },
  ];
}

export interface OpcoesCalendario {
  /** Inclui Carnaval e Corpus Christi. Padrão: true. */
  bancarios?: boolean;
  /** Feriados municipais ou estaduais informados pelo usuário. */
  locais?: { data: DataISO; nome?: string }[];
  /**
   * Sábado conta como dia útil na contagem do 5º dia útil. Padrão: true,
   * conforme o entendimento aplicado ao art. 459, §1º, da CLT: excluem-se
   * apenas domingos e feriados.
   */
  sabadoEhUtil?: boolean;
}

export function feriadosDoAno(ano: number, opcoes: OpcoesCalendario = {}): Feriado[] {
  const { bancarios = true, locais = [] } = opcoes;
  const lista = [...feriadosNacionais(ano)];
  if (bancarios) lista.push(...feriadosBancarios(ano));
  for (const item of locais) {
    if (item.data.startsWith(String(ano))) {
      lista.push({ data: item.data, nome: item.nome || "Feriado local", tipo: "local" });
    }
  }
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}

export function mapaDeFeriados(ano: number, opcoes: OpcoesCalendario = {}): Map<DataISO, Feriado> {
  const mapa = new Map<DataISO, Feriado>();
  for (const f of feriadosDoAno(ano, opcoes)) {
    if (!mapa.has(f.data)) mapa.set(f.data, f);
  }
  return mapa;
}

export interface DiaDoMes {
  data: DataISO;
  ehUtil: boolean;
  /** Motivo pelo qual o dia não é útil, quando for o caso. */
  motivo?: string;
  /** Posição na contagem de dias úteis (1, 2, 3...), quando útil. */
  ordem?: number;
}

const NOMES_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function nomeDoDiaDaSemana(data: DataISO): string {
  return NOMES_SEMANA[paraUTC(data).getUTCDay()]!;
}

/** Calendário do mês com a marcação de dia útil, na ordem do mês. */
export function calendarioDoMes(
  ano: number,
  mes1a12: number,
  opcoes: OpcoesCalendario = {},
): DiaDoMes[] {
  const { sabadoEhUtil = true } = opcoes;
  const feriados = mapaDeFeriados(ano, opcoes);
  const ultimoDia = new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
  const dias: DiaDoMes[] = [];
  let ordem = 0;
  for (let d = 1; d <= ultimoDia; d += 1) {
    const data = paraISO(ano, mes1a12, d);
    const semana = paraUTC(data).getUTCDay();
    const feriado = feriados.get(data);
    let ehUtil = true;
    let motivo: string | undefined;
    if (semana === 0) {
      ehUtil = false;
      motivo = "domingo";
    } else if (semana === 6 && !sabadoEhUtil) {
      ehUtil = false;
      motivo = "sábado";
    } else if (feriado) {
      ehUtil = false;
      motivo = feriado.nome;
    }
    if (ehUtil) ordem += 1;
    dias.push({ data, ehUtil, motivo, ordem: ehUtil ? ordem : undefined });
  }
  return dias;
}

/**
 * Data-limite legal de pagamento do salário: o 5º dia útil do mês seguinte ao
 * mês trabalhado (art. 459, §1º, da CLT).
 *
 * @param anoCompetencia ano do mês TRABALHADO
 * @param mesCompetencia mês TRABALHADO (1 a 12)
 */
export function quintoDiaUtil(
  anoCompetencia: number,
  mesCompetencia: number,
  opcoes: OpcoesCalendario = {},
  quantosDiasUteis = 5,
): { vencimento: DataISO; contagem: DiaDoMes[]; calendario: DiaDoMes[] } {
  const ano = mesCompetencia === 12 ? anoCompetencia + 1 : anoCompetencia;
  const mes = mesCompetencia === 12 ? 1 : mesCompetencia + 1;
  const calendario = calendarioDoMes(ano, mes, opcoes);
  const uteis = calendario.filter((d) => d.ehUtil);
  const alvo = uteis[quantosDiasUteis - 1];
  if (!alvo) {
    // Mês sem dias úteis suficientes é impossível no calendário real; o
    // fallback mantém a função total em vez de lançar.
    const ultimo = calendario[calendario.length - 1]!;
    return { vencimento: ultimo.data, contagem: uteis, calendario };
  }
  return { vencimento: alvo.data, contagem: uteis.slice(0, quantosDiasUteis), calendario };
}

export { deUTC };
