/**
 * Prazos e valores de férias e décimo terceiro.
 *
 * Férias: a remuneração deve ser paga até dois dias antes do início do gozo
 * (art. 145 da CLT). O terço constitucional integra essa remuneração (art. 7º,
 * XVII, da Constituição).
 *
 * Décimo terceiro: a primeira parcela vai até 30 de novembro e a segunda até 20
 * de dezembro (Lei 4.090/1962 e Lei 4.749/1965). Quando a data-limite cai em dia
 * sem expediente bancário, o pagamento é antecipado para o dia útil anterior.
 *
 * O que este arquivo deliberadamente NÃO faz: aplicar pagamento em dobro por
 * atraso na remuneração das férias. A Súmula 450 do TST, que previa isso, foi
 * declarada inconstitucional pelo Supremo Tribunal Federal no julgamento da
 * ADPF 501, em 16 de setembro de 2022. A dobra do art. 137 da CLT continua
 * válida em outra hipótese: férias gozadas fora do período concessivo.
 */

import { paraISO, paraUTC, somarDias, type DataISO } from "./data";
import { arredondar, type Centavos } from "./dinheiro";
import { mapaDeFeriados } from "./feriados";

/** Recua a data até o dia útil bancário anterior, se necessário. */
export function diaBancarioAnteriorOuIgual(
  data: DataISO,
  feriadosLocais: { data: DataISO; nome?: string }[] = [],
): DataISO {
  let atual = data;
  for (let i = 0; i < 15; i += 1) {
    const ano = Number(atual.slice(0, 4));
    const feriados = mapaDeFeriados(ano, { bancarios: true, locais: feriadosLocais });
    const semana = paraUTC(atual).getUTCDay();
    if (semana !== 0 && semana !== 6 && !feriados.has(atual)) return atual;
    atual = somarDias(atual, -1);
  }
  return atual;
}

/** Art. 145 da CLT: até dois dias antes do início do período de gozo. */
export function vencimentoFerias(inicioDoGozo: DataISO): DataISO {
  return somarDias(inicioDoGozo, -2);
}

export interface RemuneracaoFerias {
  diasDeFerias: number;
  diasVendidos: number;
  feriasCentavos: Centavos;
  tercoFeriasCentavos: Centavos;
  abonoCentavos: Centavos;
  tercoAbonoCentavos: Centavos;
  totalCentavos: Centavos;
}

/**
 * Remuneração de férias a partir do salário mensal. O abono pecuniário é a
 * venda de até um terço das férias (art. 143 da CLT) e também recebe o terço.
 */
export function calcularRemuneracaoFerias(
  salarioMensalCentavos: Centavos,
  diasDeFerias: number,
  diasVendidos = 0,
): RemuneracaoFerias {
  const diaria = Math.max(0, salarioMensalCentavos) / 30;
  const inteiro = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  // Quem vende dias descansa menos: descanso mais venda nunca passa de trinta,
  // e a venda para em um terço (art. 143 da CLT). Vender é a escolha da
  // pessoa, então é o descanso que se ajusta.
  const vendidos = Math.min(10, inteiro(diasVendidos));
  const dias = Math.min(30 - vendidos, inteiro(diasDeFerias));
  const ferias = arredondar(diaria * dias);
  const terco = arredondar(ferias / 3);
  const abono = arredondar(diaria * vendidos);
  const tercoAbono = arredondar(abono / 3);
  return {
    diasDeFerias: dias,
    diasVendidos: vendidos,
    feriasCentavos: ferias,
    tercoFeriasCentavos: terco,
    abonoCentavos: abono,
    tercoAbonoCentavos: tercoAbono,
    totalCentavos: ferias + terco + abono + tercoAbono,
  };
}

/**
 * Valor devido de um período de férias a partir do que a pessoa informou.
 *
 * A dobra do art. 137 da CLT alcança a remuneração das férias e o terço. O
 * abono pecuniário é venda de dias, não remuneração de descanso, e dobrá-lo é
 * controvertido: aqui ele fica de fora da dobra. Quando o valor total foi
 * digitado pronto, não há como separar, e o total inteiro é dobrado.
 */
export function valorDevidoDasFerias(entrada: {
  modo: "calcular" | "informar";
  salarioBase: number | null;
  dias: number;
  diasVendidos: number;
  valorInformado: number | null;
  foraDoPeriodoConcessivo: boolean;
}): Centavos {
  if (entrada.modo === "informar") {
    const valor = Math.max(0, entrada.valorInformado ?? 0);
    return entrada.foraDoPeriodoConcessivo ? valor * 2 : valor;
  }
  const c = calcularRemuneracaoFerias(entrada.salarioBase ?? 0, entrada.dias, entrada.diasVendidos);
  const descanso = c.feriasCentavos + c.tercoFeriasCentavos;
  const abono = c.abonoCentavos + c.tercoAbonoCentavos;
  return (entrada.foraDoPeriodoConcessivo ? descanso * 2 : descanso) + abono;
}

/** Primeira parcela do décimo terceiro: até 30 de novembro. */
export function vencimentoDecimoPrimeira(
  ano: number,
  feriadosLocais: { data: DataISO; nome?: string }[] = [],
): DataISO {
  return diaBancarioAnteriorOuIgual(paraISO(ano, 11, 30), feriadosLocais);
}

/** Segunda parcela do décimo terceiro: até 20 de dezembro. */
export function vencimentoDecimoSegunda(
  ano: number,
  feriadosLocais: { data: DataISO; nome?: string }[] = [],
): DataISO {
  return diaBancarioAnteriorOuIgual(paraISO(ano, 12, 20), feriadosLocais);
}

/** Décimo terceiro proporcional: um doze avos por mês com 15 dias ou mais. */
export function decimoProporcional(
  salarioMensalCentavos: Centavos,
  mesesTrabalhados: number,
): Centavos {
  const meses = Math.max(0, Math.min(12, Math.round(mesesTrabalhados)));
  return arredondar((Math.max(0, salarioMensalCentavos) * meses) / 12);
}
