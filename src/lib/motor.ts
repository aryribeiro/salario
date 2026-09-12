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
  diasNoMes,
  diferencaEmDias,
  ehDataISO,
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

/**
 * Juros simples do período, sem capitalização.
 *
 * Com taxa fixa, o mês comercial de 30 dias é a convenção usada nos cálculos
 * trabalhistas. Com série mensal, cada mês entra com a sua própria taxa,
 * proporcional aos dias em que a dívida existiu dentro daquele mês: é o único
 * jeito honesto de aplicar a taxa legal do art. 406 do Código Civil, que muda
 * de um mês para o outro.
 */
function jurosDoPeriodo(
  valor: Centavos,
  vencimento: DataISO,
  ate: DataISO,
  juros: Parametros["juros"],
): { centavos: Centavos; mesesSemTaxa: string[] } {
  const dias = diferencaEmDias(vencimento, ate);
  if (!Number.isFinite(dias) || dias <= 0 || valor <= 0 || !juros.ativo) {
    return { centavos: 0, mesesSemTaxa: [] };
  }

  if (juros.modo === "fixa") {
    if (juros.taxaMesPct <= 0) return { centavos: 0, mesesSemTaxa: [] };
    return { centavos: arredondar((valor * (juros.taxaMesPct / 100) * dias) / 30), mesesSemTaxa: [] };
  }

  const mesesSemTaxa: string[] = [];
  let total = 0;
  for (const mes of intervaloDeMeses(chaveMesDaData(vencimento), chaveMesDaData(ate))) {
    const [ano, numero] = mes.split("-").map(Number);
    const totalDeDias = diasNoMes(ano!, numero!);
    const inicioDoMes = `${mes}-01`;
    // A fronteira do mês é o dia 1º do mês seguinte, não o último dia deste:
    // usar o último dia perderia a diária da virada e o total não fecharia com
    // os dias corridos do período.
    const seguinte = proximoMes(ano!, numero!);
    const fimDoMes = `${chaveMes(seguinte.ano, seguinte.mes)}-01`;
    const inicio = inicioDoMes > vencimento ? inicioDoMes : vencimento;
    const fim = fimDoMes < ate ? fimDoMes : ate;
    const diasNoTrecho = diferencaEmDias(inicio, fim);
    if (diasNoTrecho <= 0) continue;
    const taxa = juros.serie[mes];
    if (taxa === undefined) {
      mesesSemTaxa.push(mes);
      continue;
    }
    total += (valor * (taxa / 100) * diasNoTrecho) / totalDeDias;
  }
  return { centavos: arredondar(total), mesesSemTaxa };
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
  aVencer: boolean;
  quitadaNoPrazo: boolean;
  pagamentosAposApuracao: number;
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

  // Antes do vencimento não existe mora (art. 397 do Código Civil). A parcela
  // ainda não vencida na data da apuração fica visível, mas fora do total.
  const aVencer = vencimento > dataApuracao;

  for (const pagamento of ordenados) {
    // Pagamento datado depois da apuração ainda não aconteceu: não quita nada
    // e é apenas registrado, para o memorial não dar por pago o que é promessa.
    const futuro = pagamento.data > dataApuracao;
    const aplicado = futuro ? 0 : Math.max(0, Math.min(saldo, pagamento.valorCentavos));
    saldo -= aplicado;
    const dias = Math.max(0, diferencaEmDias(vencimento, pagamento.data));
    // Um pagamento que nada amortiza, porque a parcela já estava quitada, não
    // pode carregar dias de atraso: ele inflava o maior atraso e a multa por
    // salário-dia de uma competência paga em dia.
    const situacao: PagamentoApurado["situacao"] =
      pagamento.valorCentavos <= 0
        ? "ignorado"
        : futuro
          ? "futuro"
          : aplicado === 0
            ? "excedente"
            : pagamento.data < vencimento
              ? "adiantado"
              : pagamento.data === vencimento
                ? "em dia"
                : "atrasado";
    const excedente =
      situacao === "ignorado" || situacao === "futuro" ? 0 : pagamento.valorCentavos - aplicado;
    const emAtraso = situacao === "atrasado";
    const info = emAtraso
      ? fatorDeCorrecao(vencimento, pagamento.data, parametros)
      : { fator: 0, ausentes: [] as string[] };
    info.ausentes.forEach((m) => mesesSemIndice.add(m));
    const correcaoDoPagamento = emAtraso ? correcaoDe(aplicado, info.fator) : 0;
    // Súmula 200 do TST: os juros incidem sobre o valor já corrigido.
    const jurosDoPagamento = emAtraso
      ? jurosDoPeriodo(aplicado + correcaoDoPagamento, vencimento, pagamento.data, juros)
      : { centavos: 0, mesesSemTaxa: [] as string[] };
    jurosDoPagamento.mesesSemTaxa.forEach((m) => mesesSemIndice.add(m));
    pagamentos.push({
      id: pagamento.id,
      data: pagamento.data,
      valorInformadoCentavos: pagamento.valorCentavos,
      valorAplicadoCentavos: aplicado,
      excedenteCentavos: excedente,
      diasAtraso: emAtraso ? dias : 0,
      jurosCentavos: jurosDoPagamento.centavos,
      correcaoCentavos: correcaoDoPagamento,
      situacao,
      descricao: pagamento.descricao,
    });
  }

  const saldoAberto = Math.max(0, saldo);
  const saldoEmMora = aVencer ? 0 : saldoAberto;
  const diasAtrasoSaldo =
    saldoEmMora > 0 ? Math.max(0, diferencaEmDias(vencimento, dataApuracao)) : 0;
  const correcaoSaldoInfo =
    saldoEmMora > 0 && diasAtrasoSaldo > 0
      ? fatorDeCorrecao(vencimento, dataApuracao, parametros)
      : { fator: 0, ausentes: [] as string[] };
  correcaoSaldoInfo.ausentes.forEach((m) => mesesSemIndice.add(m));
  const correcaoSaldo = saldoEmMora > 0 ? correcaoDe(saldoEmMora, correcaoSaldoInfo.fator) : 0;
  // Súmula 200 do TST também aqui: juros sobre o saldo corrigido.
  const calculoSaldo =
    saldoEmMora > 0
      ? jurosDoPeriodo(saldoEmMora + correcaoSaldo, vencimento, dataApuracao, juros)
      : { centavos: 0, mesesSemTaxa: [] as string[] };
  calculoSaldo.mesesSemTaxa.forEach((m) => mesesSemIndice.add(m));
  const jurosSaldo = calculoSaldo.centavos;

  const pagoComAtraso = somar(
    pagamentos.filter((p) => p.situacao === "atrasado").map((p) => p.valorAplicadoCentavos),
  );
  const valorEmAtraso = pagoComAtraso + saldoEmMora;
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
    totalDevidoCentavos: saldoEmMora + encargos,
    maiorAtrasoDias,
    emAtraso,
    aVencer,
    quitadaNoPrazo: saldoAberto === 0 && !emAtraso,
    pagamentosAposApuracao: pagamentos.filter((p) => p.situacao === "futuro").length,
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
  // A multa da norma coletiva só alcança férias e 13º se quem calcula disser
  // que a cláusula da sua categoria vai até lá.
  const multa = parametros.multa.aplicarEmObrigacoes
    ? parametros.multa
    : { ...parametros.multa, ativa: false };
  const nucleo = apurarNucleo(
    obrigacao.valorDevidoCentavos,
    obrigacao.vencimento,
    obrigacao.pagamentos,
    { ...parametros, multa },
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

/**
 * Data inválida em qualquer ponto vira NaN silencioso no total. Falhar alto
 * aqui é melhor do que imprimir "R$ NaN" num memorial.
 */
function exigirDatasValidas(
  competencias: Competencia[],
  parametros: Parametros,
  obrigacoes: Obrigacao[],
) {
  const invalida = (data: string, onde: string) => {
    if (!ehDataISO(data)) throw new Error(`Data inválida em ${onde}: "${data}".`);
  };
  invalida(parametros.dataApuracao, "data de apuração");
  competencias.forEach((c) =>
    c.pagamentos.forEach((p) => invalida(p.data, `pagamento da competência ${c.ano}-${c.mes}`)),
  );
  obrigacoes.forEach((o) => {
    invalida(o.vencimento, `vencimento de ${o.rotulo}`);
    o.pagamentos.forEach((p) => invalida(p.data, `pagamento de ${o.rotulo}`));
  });
  parametros.calendario.locais.forEach((f) => invalida(f.data, "feriado local"));
}

export function apurar(
  competencias: Competencia[],
  parametros: Parametros,
  extras: ExtrasApuracao = {},
): Apuracao {
  exigirDatasValidas(competencias, parametros, extras.obrigacoes ?? []);
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
  const totalSaldo = somar(todas.map((c) => (c.aVencer ? 0 : c.saldoAbertoCentavos)));
  const totalAVencer = somar(todas.map((c) => (c.aVencer ? c.saldoAbertoCentavos : 0)));

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
    totalAVencerCentavos: totalAVencer,
    pagamentosAposApuracao: somar(todas.map((c) => c.pagamentosAposApuracao)),
    competenciasComAtraso: todas.filter((c) => c.emAtraso).length,
    competenciasEmAberto: todas.filter((c) => !c.aVencer && c.saldoAbertoCentavos > 0).length,
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
