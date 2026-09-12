/**
 * O rascunho que fica guardado no navegador.
 *
 * Duas regras nascem de um defeito real: um rascunho gravado por uma versão
 * antiga do aplicativo não trazia o modo dos juros, a mesclagem rasa com os
 * padrões não repunha o campo e o motor devolvia juros zero em silêncio.
 *
 *   1. Tudo que vem do armazenamento é tratado como desconhecido e passa pelo
 *      normalizador, seção por seção, campo por campo. O que faltar recebe o
 *      padrão; o que vier com tipo errado é descartado.
 *   2. A chave tem versão. Ao mudar o formato, a versão sobe e a leitura da
 *      anterior continua funcionando, para ninguém perder trabalho.
 */

import { chaveMes, ehDataISO, hojeLocalISO, proximoMes, type DataISO } from "./data";
import type { Regiao } from "./regiao";
import type { Parametros } from "./tipos";

export const CHAVE_RASCUNHO = "salarium-debitum:v2";
/** Formato anterior, ainda lido para migrar quem já usava o aplicativo. */
export const CHAVE_RASCUNHO_ANTIGA = "salarium-debitum:v1";

export interface LinhaPagamento {
  id: string;
  data: DataISO;
  valor: number | null;
}

export interface ItemSalario {
  id: string;
  /** "2026-01" */
  mes: string;
  valor: number | null;
  pagamentos: LinhaPagamento[];
}

export interface ItemFerias {
  id: string;
  descricao: string;
  inicio: DataISO;
  modo: "calcular" | "informar";
  salarioBase: number | null;
  dias: number;
  diasVendidos: number;
  valorInformado: number | null;
  foraDoPeriodoConcessivo: boolean;
  pagamentos: LinhaPagamento[];
}

export interface ItemDecimo {
  id: string;
  ano: number;
  primeira: number | null;
  pagamentosPrimeira: LinhaPagamento[];
  segunda: number | null;
  pagamentosSegunda: LinhaPagamento[];
}

export interface ItemFgts {
  id: string;
  mes: string;
  remuneracao: number | null;
  recolhimento: DataISO | "";
  aprendiz: boolean;
}

/** Uma cláusula de multa guardada pelo usuário para reutilizar. */
export interface ClausulaSalva {
  id: string;
  nome: string;
  tipo: Parametros["multa"]["tipo"];
  valor: number;
  base: Parametros["multa"]["base"];
  tetoPercentual: number | null;
  clausula: string;
}

export interface Estado {
  dataApuracao: DataISO;
  identificacao: Parametros["identificacao"];
  juros: Parametros["juros"];
  multa: Parametros["multa"];
  correcao: Omit<Parametros["correcao"], "serie">;
  regiao: Regiao;
  bancarios: boolean;
  sabadoEhUtil: boolean;
  feriadosLocais: { data: DataISO; nome?: string }[];
  salarios: ItemSalario[];
  ferias: ItemFerias[];
  decimos: ItemDecimo[];
  fgtsAtivo: boolean;
  fgts: ItemFgts[];
  clausulasSalvas: ClausulaSalva[];
}

export function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

export function mesAnterior(data: DataISO): string {
  const [ano, mes] = data.slice(0, 7).split("-").map(Number);
  return mes === 1 ? chaveMes(ano! - 1, 12) : chaveMes(ano!, mes! - 1);
}

export function estadoInicial(hoje: DataISO = hojeLocalISO()): Estado {
  return {
    dataApuracao: hoje,
    identificacao: {
      empresa: "",
      cnpj: "",
      empregado: "",
      cargo: "",
      responsavel: "",
      baseSalarial: "liquido",
      observacoes: "",
    },
    juros: {
      ativo: true,
      modo: "fixa",
      taxaMesPct: 1,
      serie: {},
      fundamento: "art. 39 da Lei 8.177/1991",
    },
    multa: {
      ativa: false,
      tipo: "percentual",
      valor: 10,
      base: "atraso",
      clausula: "",
      tetoPercentual: null,
    },
    correcao: { ativa: false, modo: "indice", indice: "IPCA", percentualManual: 0 },
    regiao: "sp-capital",
    bancarios: true,
    sabadoEhUtil: true,
    feriadosLocais: [],
    salarios: [{ id: novoId(), mes: mesAnterior(hoje), valor: null, pagamentos: [] }],
    ferias: [],
    decimos: [],
    fgtsAtivo: false,
    fgts: [],
    clausulasSalvas: [],
  };
}

/**
 * Cenário de demonstração, completo de propósito: identificação preenchida e
 * dois meses que mostram o que a ferramenta tem de diferente, um pago em duas
 * vezes e outro com saldo em aberto. Quem clica em "Ver exemplo" precisa
 * conseguir baixar o memorial sem preencher mais nada.
 */
export function exemplo(hoje: DataISO = hojeLocalISO()): Estado {
  const base = estadoInicial(hoje);
  const [ano, mes] = mesAnterior(hoje).split("-").map(Number);
  const anterior = mes === 1 ? chaveMes(ano! - 1, 12) : chaveMes(ano!, mes! - 1);

  /** Mês em que o salário daquela competência deveria ter sido pago. */
  const mesDoPagamento = (competencia: string) => {
    const [a, m] = competencia.split("-").map(Number);
    const seguinte = proximoMes(a!, m!);
    return chaveMes(seguinte.ano, seguinte.mes);
  };

  return {
    ...base,
    identificacao: {
      ...base.identificacao,
      empresa: "Comércio Exemplo Ltda.",
      cnpj: "11.222.333/0001-81",
      empregado: "Maria de Souza",
      cargo: "Auxiliar administrativa",
      responsavel: "Gerência de pessoas",
      observacoes: "Cenário de demonstração, com dados fictícios.",
    },
    salarios: [
      {
        id: novoId(),
        mes: anterior,
        valor: 320_000,
        pagamentos: [
          { id: novoId(), data: `${mesDoPagamento(anterior)}-05`, valor: 160_000 },
          { id: novoId(), data: `${mesDoPagamento(anterior)}-19`, valor: 160_000 },
        ],
      },
      {
        id: novoId(),
        mes: mesAnterior(hoje),
        valor: 320_000,
        pagamentos: [
          { id: novoId(), data: `${mesDoPagamento(mesAnterior(hoje))}-12`, valor: 180_000 },
        ],
      },
    ],
  };
}

/* ----------------------------------------------------------- normalização */

type Desconhecido = Record<string, unknown>;

const ehObjeto = (v: unknown): v is Desconhecido => typeof v === "object" && v !== null;
const texto = (v: unknown, padrao: string) => (typeof v === "string" ? v : padrao);
const numero = (v: unknown, padrao: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : padrao;
const numeroOuNulo = (v: unknown, padrao: number | null) =>
  v === null ? null : typeof v === "number" && Number.isFinite(v) ? v : padrao;
const booleano = (v: unknown, padrao: boolean) => (typeof v === "boolean" ? v : padrao);
const umDe = <T extends string>(v: unknown, opcoes: readonly T[], padrao: T): T =>
  typeof v === "string" && (opcoes as readonly string[]).includes(v) ? (v as T) : padrao;
const dataOuVazia = (v: unknown): DataISO => (typeof v === "string" && ehDataISO(v) ? v : "");
const mesOuVazio = (v: unknown): string =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : "";
const id = (v: unknown) => (typeof v === "string" && v ? v : novoId());

function pagamentos(v: unknown): LinhaPagamento[] {
  if (!Array.isArray(v)) return [];
  return v.filter(ehObjeto).map((p) => ({
    id: id(p.id),
    data: dataOuVazia(p.data),
    valor: numeroOuNulo(p.valor, null),
  }));
}

/**
 * Reconstrói um Estado válido a partir de qualquer coisa que tenha sido lida
 * do armazenamento. Devolve null só quando não há nada aproveitável.
 */
export function normalizarRascunho(bruto: unknown, hoje: DataISO = hojeLocalISO()): Estado | null {
  if (!ehObjeto(bruto)) return null;
  const padrao = estadoInicial(hoje);

  const idf = ehObjeto(bruto.identificacao) ? bruto.identificacao : {};
  const jur = ehObjeto(bruto.juros) ? bruto.juros : {};
  const mul = ehObjeto(bruto.multa) ? bruto.multa : {};
  const cor = ehObjeto(bruto.correcao) ? bruto.correcao : {};

  const salarios: ItemSalario[] = Array.isArray(bruto.salarios)
    ? bruto.salarios.filter(ehObjeto).map((s) => ({
        id: id(s.id),
        mes: mesOuVazio(s.mes),
        valor: numeroOuNulo(s.valor, null),
        pagamentos: pagamentos(s.pagamentos),
      }))
    : padrao.salarios;

  const ferias: ItemFerias[] = Array.isArray(bruto.ferias)
    ? bruto.ferias.filter(ehObjeto).map((f) => ({
        id: id(f.id),
        descricao: texto(f.descricao, ""),
        inicio: dataOuVazia(f.inicio),
        modo: umDe(f.modo, ["calcular", "informar"] as const, "calcular"),
        salarioBase: numeroOuNulo(f.salarioBase, null),
        dias: numero(f.dias, 30),
        diasVendidos: numero(f.diasVendidos, 0),
        valorInformado: numeroOuNulo(f.valorInformado, null),
        foraDoPeriodoConcessivo: booleano(f.foraDoPeriodoConcessivo, false),
        pagamentos: pagamentos(f.pagamentos),
      }))
    : [];

  const decimos: ItemDecimo[] = Array.isArray(bruto.decimos)
    ? bruto.decimos.filter(ehObjeto).map((d) => ({
        id: id(d.id),
        ano: numero(d.ano, Number(hoje.slice(0, 4)) - 1),
        primeira: numeroOuNulo(d.primeira, null),
        pagamentosPrimeira: pagamentos(d.pagamentosPrimeira),
        segunda: numeroOuNulo(d.segunda, null),
        pagamentosSegunda: pagamentos(d.pagamentosSegunda),
      }))
    : [];

  const fgts: ItemFgts[] = Array.isArray(bruto.fgts)
    ? bruto.fgts.filter(ehObjeto).map((f) => ({
        id: id(f.id),
        mes: mesOuVazio(f.mes),
        remuneracao: numeroOuNulo(f.remuneracao, null),
        recolhimento: dataOuVazia(f.recolhimento),
        aprendiz: booleano(f.aprendiz, false),
      }))
    : [];

  const clausulasSalvas: ClausulaSalva[] = Array.isArray(bruto.clausulasSalvas)
    ? bruto.clausulasSalvas
        .filter(ehObjeto)
        .map((c) => ({
          id: id(c.id),
          nome: texto(c.nome, ""),
          tipo: umDe(c.tipo, ["percentual", "fixo", "salarioDia"] as const, "percentual"),
          valor: numero(c.valor, 0),
          base: umDe(c.base, ["atraso", "salario"] as const, "atraso"),
          tetoPercentual: numeroOuNulo(c.tetoPercentual, null),
          clausula: texto(c.clausula, ""),
        }))
        .filter((c) => c.nome.trim() !== "")
    : [];

  const feriadosLocais = Array.isArray(bruto.feriadosLocais)
    ? bruto.feriadosLocais
        .filter(ehObjeto)
        .map((f) => ({ data: dataOuVazia(f.data), nome: texto(f.nome, "") || undefined }))
        .filter((f) => f.data !== "")
    : [];

  return {
    dataApuracao: dataOuVazia(bruto.dataApuracao) || hoje,
    identificacao: {
      empresa: texto(idf.empresa, ""),
      cnpj: texto(idf.cnpj, ""),
      empregado: texto(idf.empregado, ""),
      cargo: texto(idf.cargo, ""),
      responsavel: texto(idf.responsavel, ""),
      baseSalarial: umDe(idf.baseSalarial, ["liquido", "bruto"] as const, "liquido"),
      observacoes: texto(idf.observacoes, ""),
    },
    juros: {
      ativo: booleano(jur.ativo, padrao.juros.ativo),
      modo: umDe(jur.modo, ["fixa", "serie"] as const, padrao.juros.modo),
      taxaMesPct: numero(jur.taxaMesPct, padrao.juros.taxaMesPct),
      // A série vem sempre da consulta ao Banco Central, nunca do rascunho.
      serie: {},
      fundamento: texto(jur.fundamento, padrao.juros.fundamento),
    },
    multa: {
      ativa: booleano(mul.ativa, padrao.multa.ativa),
      tipo: umDe(mul.tipo, ["percentual", "fixo", "salarioDia"] as const, padrao.multa.tipo),
      valor: numero(mul.valor, padrao.multa.valor),
      base: umDe(mul.base, ["atraso", "salario"] as const, padrao.multa.base),
      clausula: texto(mul.clausula, ""),
      tetoPercentual: numeroOuNulo(mul.tetoPercentual, null),
    },
    correcao: {
      ativa: booleano(cor.ativa, padrao.correcao.ativa),
      modo: umDe(cor.modo, ["indice", "manual"] as const, padrao.correcao.modo),
      indice: umDe(cor.indice, ["IPCA", "INPC", "IGPM"] as const, padrao.correcao.indice),
      percentualManual: numero(cor.percentualManual, 0),
    },
    regiao: umDe(bruto.regiao, ["sp-capital", "sp-estado", "nenhuma"] as const, padrao.regiao),
    bancarios: booleano(bruto.bancarios, padrao.bancarios),
    sabadoEhUtil: booleano(bruto.sabadoEhUtil, padrao.sabadoEhUtil),
    feriadosLocais,
    salarios,
    ferias,
    decimos,
    fgtsAtivo: booleano(bruto.fgtsAtivo, false),
    fgts,
    clausulasSalvas,
  };
}

/** Lê o rascunho da versão atual ou, na falta dele, da anterior. */
export function lerRascunhoDoNavegador(): Estado | null {
  try {
    const atual = localStorage.getItem(CHAVE_RASCUNHO);
    if (atual) return normalizarRascunho(JSON.parse(atual));
    const antigo = localStorage.getItem(CHAVE_RASCUNHO_ANTIGA);
    if (antigo) return normalizarRascunho(JSON.parse(antigo));
  } catch {
    /* JSON quebrado ou navegador sem armazenamento: começa do zero */
  }
  return null;
}
