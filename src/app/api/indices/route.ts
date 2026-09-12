import { NextResponse } from "next/server";

/**
 * Ponte com o Sistema Gerenciador de Séries Temporais do Banco Central.
 *
 * Só índice econômico atravessa esta rota. Nome, salário, datas de pagamento e
 * qualquer outro dado do cálculo permanecem no navegador: o servidor nunca os vê.
 *
 * Camadas de proteção, da mais barata para a mais cara:
 *   1. cache da CDN, pelo cabeçalho Cache-Control;
 *   2. cache em memória do processo, com validade e cópia antiga de reserva;
 *   3. até três tentativas com recuo exponencial e jitter;
 *   4. se tudo falhar e existir cópia antiga, ela é servida com aviso;
 *   5. só então a rota admite a falha e manda informar o percentual à mão.
 */

const SERIES = {
  IPCA: { codigo: 433, nome: "IPCA (IBGE) — variação mensal" },
  INPC: { codigo: 188, nome: "INPC (IBGE) — variação mensal" },
  IGPM: { codigo: 189, nome: "IGP-M (FGV) — variação mensal" },
  SELIC: { codigo: 4390, nome: "Selic acumulada no mês" },
} as const;

type NomeSerie = keyof typeof SERIES;

const TAXA_LEGAL = "TAXA_LEGAL";
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Erro que não adianta repetir: o pedido é que está errado, não a origem. */
class ErroDefinitivo extends Error {}
const VALIDADE_MS = 6 * 60 * 60 * 1000;
const RESERVA_MS = 30 * 24 * 60 * 60 * 1000;

export const revalidate = 21600; // 6 horas

/* ------------------------------------------------------------------ cache */

interface Entrada {
  valores: Record<string, number>;
  gravadoEm: number;
}

/**
 * Vive enquanto a instância estiver quente. Não substitui o cache da CDN: serve
 * para poupar o Banco Central quando várias abas pedem o mesmo período e para
 * ter o que responder se a origem cair.
 */
const memoria = new Map<string, Entrada>();

function guardar(chave: string, valores: Record<string, number>) {
  memoria.set(chave, { valores, gravadoEm: Date.now() });
  if (memoria.size > 200) {
    // Limpeza simples: descarta o que já passou do prazo de reserva.
    const limite = Date.now() - RESERVA_MS;
    for (const [k, v] of memoria) if (v.gravadoEm < limite) memoria.delete(k);
  }
}

function ler(chave: string): { entrada: Entrada; fresca: boolean } | null {
  const entrada = memoria.get(chave);
  if (!entrada) return null;
  const idade = Date.now() - entrada.gravadoEm;
  if (idade > RESERVA_MS) {
    memoria.delete(chave);
    return null;
  }
  return { entrada, fresca: idade <= VALIDADE_MS };
}

/* ------------------------------------------------------------------ busca */

function primeiroDia(mes: string): string {
  const [ano, m] = mes.split("-");
  return `01/${m}/${ano}`;
}

function ultimoDia(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const dia = new Date(Date.UTC(ano!, m!, 0)).getUTCDate();
  return `${String(dia).padStart(2, "0")}/${String(m).padStart(2, "0")}/${ano}`;
}

const espera = (ms: number) => new Promise((seguir) => setTimeout(seguir, ms));

/**
 * Busca uma série com recuo exponencial e jitter. O jitter evita que várias
 * instâncias que falharam ao mesmo tempo voltem juntas contra a origem.
 *
 * Devolve null quando o Banco Central responde 404, que é a forma dele dizer
 * que ainda não há valor publicado no período. Isso não é falha.
 */
async function buscarSerie(codigo: number, de: string, ate: string): Promise<Record<string, number> | null> {
  const endereco =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados` +
    `?formato=json&dataInicial=${primeiroDia(de)}&dataFinal=${ultimoDia(ate)}`;

  let ultimoErro: unknown = new Error("sem tentativa");
  for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
    try {
      const resposta = await fetch(endereco, {
        headers: { Accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(12_000),
      });
      if (resposta.status === 404) return null;
      if (resposta.status >= 500 || resposta.status === 429) {
        throw new Error(`status ${resposta.status}`);
      }
      // Qualquer outro 4xx é defeito do pedido; repetir só martelaria a origem.
      if (!resposta.ok) throw new ErroDefinitivo(`status ${resposta.status}`);

      const bruto: unknown = await resposta.json();
      if (!Array.isArray(bruto)) throw new Error("formato inesperado");

      const valores: Record<string, number> = {};
      for (const item of bruto as { data?: string; valor?: string }[]) {
        if (!item?.data || item.valor === undefined) continue;
        const [, mes, ano] = item.data.split("/");
        const numero = Number(item.valor);
        if (!ano || !mes || !Number.isFinite(numero)) continue;
        valores[`${ano}-${mes}`] = numero;
      }
      return valores;
    } catch (erro) {
      if (erro instanceof ErroDefinitivo) throw erro;
      ultimoErro = erro;
      if (tentativa < 3) {
        const base = 400 * 2 ** (tentativa - 1);
        await espera(base + Math.random() * 250);
      }
    }
  }
  throw ultimoErro;
}

/* ----------------------------------------------------------------- rota */

const CABECALHOS = {
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pedido = (url.searchParams.get("indice") ?? "IPCA").toUpperCase();
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";

  const ehTaxaLegal = pedido === TAXA_LEGAL;
  const serie = ehTaxaLegal ? null : SERIES[pedido as NomeSerie];

  if (!ehTaxaLegal && !serie) {
    return NextResponse.json(
      { erro: "Índice não reconhecido. Use IPCA, INPC, IGPM, SELIC ou TAXA_LEGAL." },
      { status: 400 },
    );
  }
  if (!RE_MES.test(de) || !RE_MES.test(ate) || ate < de) {
    return NextResponse.json(
      { erro: "Informe o período no formato AAAA-MM, com o fim depois do início." },
      { status: 400 },
    );
  }

  /**
   * Teto de vinte anos. Nenhum cálculo de mora salarial precisa de mais que
   * isso, e sem o teto um único pedido faria o servidor baixar mais de um
   * século de série a cada chamada não cacheada.
   */
  const meses = (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 +
    (Number(ate.slice(5, 7)) - Number(de.slice(5, 7))) + 1;
  if (meses > 240) {
    return NextResponse.json(
      { erro: "O período pedido passa de vinte anos. Reduza o intervalo da consulta." },
      { status: 400 },
    );
  }

  const chave = `${pedido}:${de}:${ate}`;
  const guardado = ler(chave);
  if (guardado?.fresca) {
    return NextResponse.json(
      {
        indice: pedido,
        serieNome: ehTaxaLegal ? nomeDaTaxaLegal() : serie!.nome,
        codigoSerie: ehTaxaLegal ? [SERIES.SELIC.codigo, SERIES.IPCA.codigo] : serie!.codigo,
        fonte: FONTE,
        consultadoEm: new Date(guardado.entrada.gravadoEm).toISOString(),
        valores: guardado.entrada.valores,
        origem: "cache",
      },
      { headers: CABECALHOS },
    );
  }

  try {
    let valores: Record<string, number>;
    let aviso: string | undefined;

    if (ehTaxaLegal) {
      // A taxa legal do art. 406 do Código Civil, na redação da Lei
      // 14.905/2024, é a Selic deduzido o IPCA. Resultado negativo vale zero,
      // por determinação do §3º do mesmo artigo.
      const [selic, ipca] = await Promise.all([
        buscarSerie(SERIES.SELIC.codigo, de, ate),
        buscarSerie(SERIES.IPCA.codigo, de, ate),
      ]);
      valores = {};
      const meses = new Set([...Object.keys(selic ?? {}), ...Object.keys(ipca ?? {})]);
      for (const mes of meses) {
        const s = selic?.[mes];
        const i = ipca?.[mes];
        if (s === undefined || i === undefined) continue;
        valores[mes] = Math.max(0, Number((s - i).toFixed(4)));
      }
      if (Object.keys(valores).length === 0) {
        aviso = "Ainda não há Selic e IPCA publicados para o período consultado.";
      }
    } else {
      const resultado = await buscarSerie(serie!.codigo, de, ate);
      valores = resultado ?? {};
      if (resultado === null || Object.keys(valores).length === 0) {
        aviso = "Ainda não há índice publicado para o período consultado.";
      }
    }

    guardar(chave, valores);
    return NextResponse.json(
      {
        indice: pedido,
        serieNome: ehTaxaLegal ? nomeDaTaxaLegal() : serie!.nome,
        codigoSerie: ehTaxaLegal ? [SERIES.SELIC.codigo, SERIES.IPCA.codigo] : serie!.codigo,
        fonte: FONTE,
        consultadoEm: new Date().toISOString(),
        valores,
        aviso,
        origem: "banco-central",
      },
      { headers: CABECALHOS },
    );
  } catch (erro) {
    if (erro instanceof ErroDefinitivo) {
      return NextResponse.json(
        { erro: "O Banco Central recusou o pedido. Confira o período informado." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (guardado) {
      // Origem fora do ar, mas existe cópia anterior: melhor um número datado
      // do que nenhum número, desde que o aviso diga a idade da cópia.
      return NextResponse.json(
        {
          indice: pedido,
          serieNome: ehTaxaLegal ? nomeDaTaxaLegal() : serie!.nome,
          codigoSerie: ehTaxaLegal ? [SERIES.SELIC.codigo, SERIES.IPCA.codigo] : serie!.codigo,
          fonte: FONTE,
          consultadoEm: new Date(guardado.entrada.gravadoEm).toISOString(),
          valores: guardado.entrada.valores,
          aviso: "O Banco Central não respondeu agora. Estes valores são de uma consulta anterior.",
          origem: "reserva",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { erro: "Não foi possível falar com o Banco Central agora. Informe o percentual à mão." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

const FONTE = "Banco Central do Brasil — Sistema Gerenciador de Séries Temporais";

function nomeDaTaxaLegal() {
  return "Taxa legal do art. 406 do Código Civil: Selic acumulada no mês menos IPCA";
}
