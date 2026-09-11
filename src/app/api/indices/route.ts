import { NextResponse } from "next/server";

/**
 * Ponte com o Sistema Gerenciador de Séries Temporais do Banco Central.
 *
 * Só o índice de inflação atravessa esta rota. Nome, salário, datas de
 * pagamento e qualquer outro dado do cálculo permanecem no navegador: o
 * servidor nunca os vê.
 */

const SERIES: Record<string, { codigo: number; nome: string }> = {
  IPCA: { codigo: 433, nome: "IPCA (IBGE) — variação mensal" },
  INPC: { codigo: 188, nome: "INPC (IBGE) — variação mensal" },
  IGPM: { codigo: 189, nome: "IGP-M (FGV) — variação mensal" },
};

const RE_MES = /^\d{4}-\d{2}$/;

function primeiroDia(mes: string): string {
  const [ano, m] = mes.split("-");
  return `01/${m}/${ano}`;
}

function ultimoDia(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const dia = new Date(Date.UTC(ano!, m!, 0)).getUTCDate();
  return `${String(dia).padStart(2, "0")}/${String(m).padStart(2, "0")}/${ano}`;
}

export const revalidate = 21600; // 6 horas

export async function GET(request: Request) {
  const url = new URL(request.url);
  const indice = (url.searchParams.get("indice") ?? "IPCA").toUpperCase();
  const de = url.searchParams.get("de") ?? "";
  const ate = url.searchParams.get("ate") ?? "";

  const serie = SERIES[indice];
  if (!serie) {
    return NextResponse.json(
      { erro: "Índice não reconhecido. Use IPCA, INPC ou IGPM." },
      { status: 400 },
    );
  }
  if (!RE_MES.test(de) || !RE_MES.test(ate) || ate < de) {
    return NextResponse.json(
      { erro: "Informe o período no formato AAAA-MM, com o fim depois do início." },
      { status: 400 },
    );
  }

  const endereco =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie.codigo}/dados` +
    `?formato=json&dataInicial=${primeiroDia(de)}&dataFinal=${ultimoDia(ate)}`;

  /**
   * Uma falha isolada acontece: a primeira chamada depois de um período ocioso
   * chega a estourar o tempo. Como o usuário só veria a mensagem de erro, vale
   * uma segunda tentativa antes de desistir.
   */
  async function buscar(tentativa = 1): Promise<Response> {
    try {
      return await fetch(endereco, {
        headers: { Accept: "application/json" },
        next: { revalidate },
        signal: AbortSignal.timeout(12_000),
      });
    } catch (erro) {
      if (tentativa >= 2) throw erro;
      await new Promise((seguir) => setTimeout(seguir, 700));
      return buscar(tentativa + 1);
    }
  }

  try {
    const resposta = await buscar();
    if (!resposta.ok) {
      return NextResponse.json(
        { erro: `O Banco Central respondeu com status ${resposta.status}.` },
        { status: 502 },
      );
    }
    const bruto: unknown = await resposta.json();
    if (!Array.isArray(bruto)) {
      return NextResponse.json({ erro: "Resposta inesperada do Banco Central." }, { status: 502 });
    }
    const valores: Record<string, number> = {};
    for (const item of bruto as { data?: string; valor?: string }[]) {
      if (!item?.data || item.valor === undefined) continue;
      const [, mes, ano] = item.data.split("/");
      const numero = Number(item.valor);
      if (!ano || !mes || !Number.isFinite(numero)) continue;
      valores[`${ano}-${mes}`] = numero;
    }
    return NextResponse.json({
      indice,
      serieNome: serie.nome,
      codigoSerie: serie.codigo,
      fonte: "Banco Central do Brasil — Sistema Gerenciador de Séries Temporais",
      consultadoEm: new Date().toISOString(),
      valores,
    });
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível falar com o Banco Central agora. Informe o percentual à mão." },
      { status: 502 },
    );
  }
}
