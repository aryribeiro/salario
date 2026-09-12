/**
 * Aritmética de datas em UTC puro.
 *
 * Todo o aplicativo representa datas como "YYYY-MM-DD" (data civil, sem hora e
 * sem fuso). Usar `new Date("2026-01-05")` devolve meia-noite UTC; qualquer
 * formatação com métodos locais (getDate, toLocaleDateString) pode recuar um
 * dia em fusos negativos como o do Brasil. Por isso só usamos os métodos UTC.
 */

export type DataISO = string; // "YYYY-MM-DD"

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function ehDataISO(valor: unknown): valor is DataISO {
  if (typeof valor !== "string" || !RE_ISO.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function paraISO(ano: number, mes1a12: number, dia: number): DataISO {
  const mm = String(mes1a12).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

export function paraUTC(data: DataISO): Date {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function deUTC(dt: Date): DataISO {
  return paraISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Dias corridos entre duas datas (fim - inicio). Negativo se fim < inicio. */
export function diferencaEmDias(inicio: DataISO, fim: DataISO): number {
  const ms = paraUTC(fim).getTime() - paraUTC(inicio).getTime();
  return Math.round(ms / 86_400_000);
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const dt = paraUTC(data);
  dt.setUTCDate(dt.getUTCDate() + dias);
  return deUTC(dt);
}

/** 0 = domingo ... 6 = sábado. */
export function diaDaSemana(data: DataISO): number {
  return paraUTC(data).getUTCDay();
}

export function diasNoMes(ano: number, mes1a12: number): number {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
}

/** Chave de competência "YYYY-MM". */
export type ChaveMes = string;

export function chaveMes(ano: number, mes1a12: number): ChaveMes {
  return `${ano}-${String(mes1a12).padStart(2, "0")}`;
}

export function chaveMesDaData(data: DataISO): ChaveMes {
  return data.slice(0, 7);
}

/**
 * Lê um mês digitado como "2026-08" (campo de mês do navegador) ou "08/2026"
 * (o que uma pessoa escreve quando o navegador não oferece o seletor, como o
 * Safari de computador). Devolve null quando não há mês reconhecível.
 */
export function lerChaveMes(entrada: string): ChaveMes | null {
  const texto = (entrada ?? "").trim();
  const iso = texto.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    const mes = Number(iso[2]);
    return mes >= 1 && mes <= 12 ? `${iso[1]}-${iso[2]}` : null;
  }
  const humano = texto.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (humano) {
    const mes = Number(humano[1]);
    return mes >= 1 && mes <= 12 ? chaveMes(Number(humano[2]), mes) : null;
  }
  return null;
}

export function proximoMes(ano: number, mes1a12: number): { ano: number; mes: number } {
  return mes1a12 === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes1a12 + 1 };
}

/** Lista de chaves "YYYY-MM" de `de` até `ate`, inclusive. Vazia se ate < de. */
export function intervaloDeMeses(de: ChaveMes, ate: ChaveMes): ChaveMes[] {
  if (ate < de) return [];
  const saida: ChaveMes[] = [];
  let [ano, mes] = de.split("-").map(Number);
  for (let guarda = 0; guarda < 1200; guarda += 1) {
    const atual = chaveMes(ano, mes);
    saida.push(atual);
    if (atual === ate) break;
    ({ ano, mes } = proximoMes(ano, mes));
  }
  return saida;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function nomeDoMes(mes1a12: number): string {
  return MESES[mes1a12 - 1] ?? "";
}

/** "05/02/2026" */
export function formatarData(data: DataISO): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

/** "fevereiro de 2026" */
export function formatarCompetencia(ano: number, mes1a12: number): string {
  return `${nomeDoMes(mes1a12)} de ${ano}`;
}

/** Data de hoje segundo o relógio local do usuário, normalizada para ISO. */
export function hojeLocalISO(): DataISO {
  const agora = new Date();
  return paraISO(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}
