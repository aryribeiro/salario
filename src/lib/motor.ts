/**
 * Motor de apuração da mora salarial.
 *
 * Método, em uma frase: cada competência tem um vencimento legal próprio (o 5º
 * dia útil do mês seguinte ao trabalhado, art. 459, §1º, da CLT), cada
 * pagamento amortiza o principal na data em que aconteceu, e cada parcela
 * carrega os seus próprios dias de atraso. Assim toda linha do memorial é
 * conferível isoladamente e a soma das linhas fecha com o total.
 *
 * Juros são simples e proporcionais aos dias (mês comercial de 30 dias). Não há
 * capitalização: juros não incidem sobre juros, nem a multa entra na base dos
 * juros.
 */

import {
  chaveMes,
  chaveMesDaData,
  diferencaEmDias,
  formatarCompetencia,
  intervaloDeMeses,
  proximoMes,
  type DataISO,
} from "./data";
import { arredondar, somar, type Centavos } from "./dinheiro";
import { quintoDiaUtil } from "./feriados";
import type { EncargoFGTS } from "./fgts";
import type {
  Apuracao,
  Competencia,
  CompetenciaApurada,
  Obrigacao,
  ObrigacaoApurada,
  PagamentoApurado,
  Parametros,
} from "./tipos";

/** Fator de correção acumulado (ex.: 0,0153 = 1,53%) e meses sem índice. */
function fatorDeCorrecao(
  vencimento: DataISO,
  ate: DataISO,
  parametros: Parametros,
): { fator: number; ausentes: string[] } {
  const { correcao } = parametros;
  if (!correcao.ativa) return { fator: 0, ausentes: [] };
  if (correcao.modo === "manual") {
    return { fator: correcao.percentualManual / 100, ausentes: [] };
  }
  // Súmula 381 do TST: incide o índice do mês subsequente ao da prestação dos
  // serviços, a partir do dia 1º — que é justamente o mês do vencimento. São
  // computados os meses integralmente vencidos até o pagamento.
  const mesInicial = chaveMesDaData(vencimento);
  const mesDoPagamento = chaveMesDaData(ate);
  const meses = intervaloDeMeses(mesInicial, mesDoPagamento).filter((m) => m < mesDoPagamento);
  const ausentes: string[] = [];
  let acumulado = 1;
  for (const mes of meses) {
    const variacao = correcao.serie[mes];
    if (variacao === undefined) {
      ausentes.push(mes);
      continue;
    }
    acumulado *= 1 + variacao / 100;
  }
  return { fator: acumulado - 1, ausentes };
}

function jurosDe(valor: Centavos, dias: number, taxaMesPct: number): Centavos {
  if (dias <= 0 || valor <= 0 || taxaMesPct <= 0) return 0;
  return arredondar((valor * (taxaMesPct / 100) * dias) / 30);
}

/**
 * A correção nunca reduz o valor devido. Em período de deflação o fator
 * acumulado fica negativo, e aqui ele é tratado como zero: a correção existe
 * para recompor a inflação, não para diminuir a dívida de quem já atrasou.
 */
function correcaoDe(valor: Centavos, fator: number): Centavos {
  if (valor <= 0 || fator <= 0) return 0;
  return arredondar(valor * fator);
}

/**
 * Núcleo comum a salário mensal, férias e décimo terceiro: dado um valor
 * devido, uma data de vencimento e os pagamentos feitos, apura atraso, juros,
 * multa e correção. Só o cálculo do vencimento muda de uma parcela para outra.
 */
interface NucleoApurado {
  pagamentos: PagamentoApurado[];
  totalPagoCentavos: number;
  excedenteCentavos: number;
  saldoAbertoCentavos: number;
  diasAtrasoSaldo: number;
  jurosSaldoCentavos: number;
  correcaoSaldoCentavos: number;
  valorEmAtrasoCentavos: number;
  jurosCentavos: number;
  multaCentavos: number;
  correcaoCentavos: number;
  encargosCentavos: number;
  totalDevidoCentavos: number;
  maiorAtrasoDias: number;
  emAtraso: boolean;
  quitadaNoPrazo: boolean;
  mesesSemIndice: string[];
}

function apurarNucleo(
  valorDevidoCentavos: number,
  vencimento: DataISO,
  listaPagamentos: Competencia["pagamentos"],
  parametros: Parametros,
): NucleoApurado {
  const { juros, multa, dataApuracao } = parametros;
  const ordenados = [...listaPagamentos].sort((a, b) => a.data.localeCompare(b.data));
  let saldo = valorDevidoCentavos;
  const pagamentos: PagamentoApurado[] = [];
  const mesesSemIndice = new Set<string>();

  for (const pagamento of ordenados) {
    const aplicado = Math.max(0, Math.min(saldo, pagamento.valorCentavos));
    const excedente = pagamento.valorCentavos - aplicado;
    saldo -= aplicado;
    const dias = Math.max(0, diferencaEmDias(vencimento, pagamento.data));
    const situacao: PagamentoApurado["situacao"] =
      pagamento.valorCentavos <= 0
        ? "ignorado"
        : pagamento.data < vencimento
          ? "adiantado"
          : pagamento.data === vencimento
            ? "em dia"
            : "atrasado";
    const emAtraso = situacao === "atrasado";
    const info = emAtraso
      ? fatorDeCorrecao(vencimento, pagamento.data, parametros)
      : { fator: 0, ausentes: [] as string[] };
    info.ausentes.forEach((m) => mesesSemIndice.add(m));
    pagamentos.push({
      id: pagamento.id,
      data: pagamento.data,
      valorInformadoCentavos: pagamento.valorCentavos,
      valorAplicadoCentavos: aplicado,
      excedenteCentavos: excedente,
      diasAtraso: emAtraso ? dias : 0,
      jurosCentavos: juros.ativo && emAtraso ? jurosDe(aplicado, dias, juros.taxaMesPct) : 0,
      correcaoCentavos: emAtraso ? correcaoDe(aplicado, info.fator) : 0,
      situacao,
      descricao: pagamento.descricao,
    });
  }

  const saldoAberto = Math.max(0, saldo);
  const diasAtrasoSaldo =
    saldoAberto > 0 ? Math.max(0, diferencaEmDias(vencimento, dataApuracao)) : 0;
  const jurosSaldo =
    juros.ativo && saldoAberto > 0 ? jurosDe(saldoAberto, diasAtrasoSaldo, juros.taxaMesPct) : 0;
  const correcaoSaldoInfo =
    saldoAberto > 0 && diasAtrasoSaldo > 0
      ? fatorDeCorrecao(vencimento, dataApuracao, parametros)
      : { fator: 0, ausentes: [] as string[] };
  correcaoSaldoInfo.ausentes.forEach((m) => mesesSemIndice.add(m));
  const correcaoSaldo = saldoAberto > 0 ? correcaoDe(saldoAberto, correcaoSaldoInfo.fator) : 0;

  const pagoComAtraso = somar(
    pagamentos.filter((p) => p.situacao === "atrasado").map((p) => p.valorAplicadoCentavos),
  );
  const valorEmAtraso = pagoComAtraso + saldoAberto;
  const maiorAtrasoDias = Math.max(diasAtrasoSaldo, ...pagamentos.map((p) => p.diasAtraso), 0);
  const emAtraso = valorEmAtraso > 0 && maiorAtrasoDias > 0;

  const jurosTotais = somar(pagamentos.map((p) => p.jurosCentavos)) + jurosSaldo;
  const correcaoTotal = somar(pagamentos.map((p) => p.correcaoCentavos)) + correcaoSaldo;

  let multaCentavos = 0;
  if (multa.ativa && emAtraso) {
    const base = multa.base === "salario" ? valorDevidoCentavos : valorEmAtraso;
    if (multa.tipo === "percentual") {
      multaCentavos = arredondar(base * (multa.valor / 100));
    } else if (multa.tipo === "fixo") {
      multaCentavos = arredondar(multa.valor);
    } else {
      const salarioDia = valorDevidoCentavos / 30;
      multaCentavos = arredondar(salarioDia * multa.valor * maiorAtrasoDias);
    }
    if (multa.tetoPercentual != null && multa.tetoPercentual > 0) {
      const teto = arredondar(valorDevidoCentavos * (multa.tetoPercentual / 100));
      multaCentavos = Math.min(multaCentavos, teto);
    }
    multaCentavos = Math.max(0, multaCentavos);
  }

  const encargos = jurosTotais + multaCentavos + correcaoTotal;

  return {
    pagamentos,
    totalPagoCentavos: somar(pagamentos.map((p) => p.valorAplicadoCentavos)),
    excedenteCentavos: somar(pagamentos.map((p) => p.excedenteCentavos)),
    saldoAbertoCentavos: saldoAberto,
    diasAtrasoSaldo,
    jurosSaldoCentavos: jurosSaldo,
    correcaoSaldoCentavos: correcaoSaldo,
    valorEmAtrasoCentavos: valorEmAtraso,
    jurosCentavos: jurosTotais,
    multaCentavos,
    correcaoCentavos: correcaoTotal,
    encargosCentavos: encargos,
    totalDevidoCentavos: saldoAberto + encargos,
    maiorAtrasoDias,
    emAtraso,
    quitadaNoPrazo: saldoAberto === 0 && !emAtraso,
    mesesSemIndice: [...mesesSemIndice].sort(),
  };
}

export function apurarCompetencia(
  competencia: Competencia,
  parametros: Parametros,
): CompetenciaApurada {
  const { calendario } = parametros;
  const { vencimento, contagem } = quintoDiaUtil(competencia.ano, competencia.mes, {
    bancarios: calendario.bancarios,
    sabadoEhUtil: calendario.sabadoEhUtil,
    locais: calendario.locais,
  });
  const nucleo = apurarNucleo(
    competencia.salarioCentavos,
    vencimento,
    competencia.pagamentos,
    parametros,
  );
  return {
    id: competencia.id,
    ano: competencia.ano,
    mes: competencia.mes,
    rotulo: formatarCompetencia(competencia.ano, competencia.mes),
    salarioCentavos: competencia.salarioCentavos,
    vencimento,
    diasUteisContados: contagem.map((d) => d.data),
    ...nucleo,
  };
}

/** Férias e décimo terceiro: mesmo motor, vencimento próprio de cada parcela. */
export function apurarObrigacao(obrigacao: Obrigacao, parametros: Parametros): ObrigacaoApurada {
  const nucleo = apurarNucleo(
    obrigacao.valorDevidoCentavos,
    obrigacao.vencimento,
    obrigacao.pagamentos,
    parametros,
  );
  return {
    id: obrigacao.id,
    tipo: obrigacao.tipo,
    rotulo: obrigacao.rotulo,
    fundamento: obrigacao.fundamento,
    observacao: obrigacao.observacao,
    vencimento: obrigacao.vencimento,
    valorDevidoCentavos: obrigacao.valorDevidoCentavos,
    ...nucleo,
  };
}

export interface ExtrasApuracao {
  obrigacoes?: Obrigacao[];
  fgts?: EncargoFGTS[];
}

export function apurar(
  competencias: Competencia[],
  parametros: Parametros,
  extras: ExtrasApuracao = {},
): Apuracao {
  const apuradas = competencias
    .filter((c) => c.salarioCentavos > 0)
    .map((c) => apurarCompetencia(c, parametros))
    .sort((a, b) => chaveMes(a.ano, a.mes).localeCompare(chaveMes(b.ano, b.mes)));

  const obrigacoes = (extras.obrigacoes ?? [])
    .filter((o) => o.valorDevidoCentavos > 0)
    .map((o) => apurarObrigacao(o, parametros))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const fgts = extras.fgts ?? [];
  const todas = [...apuradas, ...obrigacoes];

  const mesesSemIndice = new Set<string>();
  todas.forEach((c) => c.mesesSemIndice.forEach((m) => mesesSemIndice.add(m)));

  const totalJuros = somar(todas.map((c) => c.jurosCentavos));
  const totalMulta = somar(todas.map((c) => c.multaCentavos));
  const totalCorrecao = somar(todas.map((c) => c.correcaoCentavos));
  const totalSaldo = somar(todas.map((c) => c.saldoAbertoCentavos));

  return {
    competencias: apuradas,
    obrigacoes,
    fgts,
    totalFgtsDepositoCentavos: somar(fgts.map((f) => f.depositoCentavos)),
    totalFgtsEncargosCentavos: somar(fgts.map((f) => f.jurosCentavos + f.multaCentavos)),
    totalSalariosCentavos: somar(apuradas.map((c) => c.salarioCentavos)),
    totalPagoCentavos: somar(todas.map((c) => c.totalPagoCentavos)),
    totalSaldoAbertoCentavos: totalSaldo,
    totalJurosCentavos: totalJuros,
    totalMultaCentavos: totalMulta,
    totalCorrecaoCentavos: totalCorrecao,
    totalEncargosCentavos: totalJuros + totalMulta + totalCorrecao,
    totalGeralCentavos: totalSaldo + totalJuros + totalMulta + totalCorrecao,
    competenciasComAtraso: todas.filter((c) => c.emAtraso).length,
    competenciasEmAberto: todas.filter((c) => c.saldoAbertoCentavos > 0).length,
    maiorAtrasoDias: todas.reduce((max, c) => Math.max(max, c.maiorAtrasoDias), 0),
    mesesSemIndice: [...mesesSemIndice].sort(),
    parametros,
    geradoEm: new Date().toISOString(),
  };
}

/** Meses que o cálculo precisa ter na série de índices, na ordem. */
export function mesesNecessarios(competencias: Competencia[], ate: DataISO): string[] {
  const chaves = new Set<string>();
  for (const c of competencias) {
    const { ano, mes } = proximoMes(c.ano, c.mes);
    intervaloDeMeses(chaveMes(ano, mes), chaveMesDaData(ate)).forEach((m) => chaves.add(m));
  }
  return [...chaves].sort();
}
