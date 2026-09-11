"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  chaveMes,
  chaveMesDaData,
  formatarData,
  hojeLocalISO,
  intervaloDeMeses,
  nomeDoMes,
  proximoMes,
  type DataISO,
} from "@/lib/data";
import { formatarMoeda } from "@/lib/dinheiro";
import { apurarFGTS, type EncargoFGTS } from "@/lib/fgts";
import { apurar, mesesNecessarios } from "@/lib/motor";
import {
  calcularRemuneracaoFerias,
  vencimentoDecimoPrimeira,
  vencimentoDecimoSegunda,
  vencimentoFerias,
} from "@/lib/parcelas";
import { feriadosDaRegiao, REGIOES, type Regiao } from "@/lib/regiao";
import { estimarLiquido, SALARIO_MINIMO_2026 } from "@/lib/tributos";
import type { Competencia, Obrigacao, Parametros } from "@/lib/tipos";

import { Detalhamento, Resumo } from "./resultado";
import {
  Aviso,
  Botao,
  CampoMoeda,
  CampoNumero,
  CampoTexto,
  Cartao,
  Etiqueta,
  Grade,
  Interruptor,
  NotaLegal,
  Selecao,
} from "./ui";

/* ------------------------------------------------------------------ estado */

interface LinhaPagamento {
  id: string;
  data: DataISO;
  valor: number | null;
}

interface ItemSalario {
  id: string;
  mes: string; // "2026-01"
  valor: number | null;
  pagamentos: LinhaPagamento[];
}

interface ItemFerias {
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

interface ItemDecimo {
  id: string;
  ano: number;
  primeira: number | null;
  pagamentosPrimeira: LinhaPagamento[];
  segunda: number | null;
  pagamentosSegunda: LinhaPagamento[];
}

interface ItemFgts {
  id: string;
  mes: string;
  remuneracao: number | null;
  recolhimento: DataISO | "";
  aprendiz: boolean;
}

interface Estado {
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
}

const CHAVE_ARMAZENAMENTO = "salarium-debitum:v1";

function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

function mesAnterior(data: DataISO): string {
  const [ano, mes] = data.slice(0, 7).split("-").map(Number);
  return mes === 1 ? chaveMes(ano - 1, 12) : chaveMes(ano, mes - 1);
}

function estadoInicial(): Estado {
  const hoje = hojeLocalISO();
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
  };
}

function exemplo(): Estado {
  const base = estadoInicial();
  const hoje = base.dataApuracao;
  const [ano, mes] = mesAnterior(hoje).split("-").map(Number);
  const anterior = mes === 1 ? chaveMes(ano - 1, 12) : chaveMes(ano, mes - 1);
  return {
    ...base,
    identificacao: {
      ...base.identificacao,
      empresa: "Empresa Exemplo Ltda.",
      empregado: "Maria de Souza",
      cargo: "Auxiliar administrativa",
      responsavel: "Gerência de pessoas",
    },
    salarios: [
      {
        id: novoId(),
        mes: anterior,
        valor: 320_000,
        pagamentos: [],
      },
      {
        id: novoId(),
        mes: mesAnterior(hoje),
        valor: 320_000,
        pagamentos: [],
      },
    ],
  };
}

/* --------------------------------------------------------------- auxiliares */

function anosEnvolvidos(estado: Estado): number[] {
  const anos = new Set<number>([Number(estado.dataApuracao.slice(0, 4))]);
  estado.salarios.forEach((s) => {
    const ano = Number(s.mes.slice(0, 4));
    anos.add(ano);
    anos.add(ano + 1);
  });
  estado.ferias.forEach((f) => f.inicio && anos.add(Number(f.inicio.slice(0, 4))));
  estado.decimos.forEach((d) => anos.add(d.ano));
  estado.fgts.forEach((f) => {
    const ano = Number(f.mes.slice(0, 4));
    anos.add(ano);
    anos.add(ano + 1);
  });
  return [...anos].filter((a) => a > 1990 && a < 2200).sort();
}

function remuneracaoDasFerias(item: ItemFerias): number {
  const bruto =
    item.modo === "informar"
      ? (item.valorInformado ?? 0)
      : calcularRemuneracaoFerias(item.salarioBase ?? 0, item.dias, item.diasVendidos).totalCentavos;
  return item.foraDoPeriodoConcessivo ? bruto * 2 : bruto;
}

function pagamentosValidos(linhas: LinhaPagamento[]) {
  return linhas
    .filter((p) => p.data && (p.valor ?? 0) > 0)
    .map((p) => ({ id: p.id, data: p.data, valorCentavos: p.valor as number }));
}

/* ---------------------------------------------------------------- widgets */

function ListaPagamentos({
  linhas,
  aoMudar,
  rotulo = "Pagamentos feitos",
}: {
  linhas: LinhaPagamento[];
  aoMudar: (linhas: LinhaPagamento[]) => void;
  rotulo?: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-borda bg-superficie-2/60 p-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-suave">{rotulo.toUpperCase()}</p>
      {linhas.length === 0 && (
        <p className="mb-2 text-xs text-suave">
          Nenhum pagamento informado. Sem pagamento, o valor fica em aberto e os juros correm até a
          data da apuração.
        </p>
      )}
      <div className="space-y-2">
        {linhas.map((linha, indice) => (
          <div key={linha.id} className="flex flex-wrap items-end gap-2">
            <CampoTexto
              rotulo={`Data do ${indice + 1}º pagamento`}
              tipo="date"
              valor={linha.data}
              aoMudar={(v) =>
                aoMudar(linhas.map((l) => (l.id === linha.id ? { ...l, data: v } : l)))
              }
              className="min-w-[150px] flex-1"
            />
            <CampoMoeda
              rotulo="Valor pago"
              centavos={linha.valor}
              aoMudar={(v) =>
                aoMudar(linhas.map((l) => (l.id === linha.id ? { ...l, valor: v } : l)))
              }
              className="min-w-[150px] flex-1"
            />
            <div className="pb-1">
              <Botao
                aparencia="perigo"
                tamanho="pequeno"
                aoClicar={() => aoMudar(linhas.filter((l) => l.id !== linha.id))}
                titulo="Remover este pagamento"
              >
                Remover
              </Botao>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Botao
          tamanho="pequeno"
          aoClicar={() => aoMudar([...linhas, { id: novoId(), data: "", valor: null }])}
        >
          + Adicionar pagamento
        </Botao>
      </div>
    </div>
  );
}

function CabecalhoItem({
  titulo,
  etiqueta,
  aoRemover,
}: {
  titulo: string;
  etiqueta?: string;
  aoRemover: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-texto">{titulo}</h3>
        {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
      </div>
      <Botao aparencia="perigo" tamanho="pequeno" aoClicar={aoRemover}>
        Remover
      </Botao>
    </div>
  );
}

/**
 * O tema mora no atributo data-tema do elemento raiz, escrito antes da primeira
 * pintura pelo script do layout. Aqui ele é lido como estado externo, o que
 * evita um efeito de sincronização e o piscar de tema na carga.
 */
let ouvintesDoTema: (() => void)[] = [];

function assinarTema(callback: () => void) {
  ouvintesDoTema.push(callback);
  return () => {
    ouvintesDoTema = ouvintesDoTema.filter((f) => f !== callback);
  };
}

function lerTema(): string {
  return document.documentElement.getAttribute("data-tema") ?? "sistema";
}

function TrocaDeTema() {
  const tema = useSyncExternalStore(assinarTema, lerTema, () => "sistema");

  const alternar = () => {
    const atual =
      tema === "sistema"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "escuro"
          : "claro"
        : tema;
    const proximo = atual === "escuro" ? "claro" : "escuro";
    document.documentElement.setAttribute("data-tema", proximo);
    try {
      localStorage.setItem("sd:tema", proximo);
    } catch {
      /* navegador sem armazenamento: o tema vale só nesta visita */
    }
    ouvintesDoTema.forEach((avisar) => avisar());
  };

  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-xl border border-borda bg-superficie px-3 py-2 text-xs font-semibold text-suave transition-colors hover:border-marca hover:text-marca"
      aria-label="Alternar entre tema claro e escuro"
    >
      {tema === "escuro" ? "Tema claro" : "Tema escuro"}
    </button>
  );
}

/* ------------------------------------------------------------------- abas */

type Aba = "salario" | "ferias" | "decimo" | "fgts" | "criterios";

const ABAS: { valor: Aba; rotulo: string; icone: string }[] = [
  { valor: "salario", rotulo: "Salário", icone: "📅" },
  { valor: "ferias", rotulo: "Férias", icone: "🏖️" },
  { valor: "decimo", rotulo: "13º salário", icone: "🎁" },
  { valor: "fgts", rotulo: "FGTS", icone: "🏦" },
  { valor: "criterios", rotulo: "Critérios", icone: "⚖️" },
];

/* ------------------------------------------------------------ componente */

export function Calculadora() {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [aba, setAba] = useState<Aba>("salario");
  const [serie, setSerie] = useState<Record<string, number>>({});
  const [serieJuros, setSerieJuros] = useState<Record<string, number>>({});
  const [statusJuros, setStatusJuros] = useState<"ocioso" | "carregando" | "pronto" | "erro">(
    "ocioso",
  );
  const [mensagemJuros, setMensagemJuros] = useState("");
  const [statusIndice, setStatusIndice] = useState<"ocioso" | "carregando" | "pronto" | "erro">(
    "ocioso",
  );
  const [mensagemIndice, setMensagemIndice] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroPdf, setErroPdf] = useState("");
  const [carregado, setCarregado] = useState(false);

  const alterar = useCallback((mudanca: Partial<Estado>) => {
    setEstado((anterior) => ({ ...anterior, ...mudanca }));
  }, []);

  /* ---------------------------------------------------------- persistência */

  useEffect(() => {
    try {
      const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Estado;
        if (salvo && Array.isArray(salvo.salarios)) {
          // Recuperar o que a pessoa digitou antes só é possível depois da
          // montagem: no servidor não existe localStorage, e ler no
          // inicializador do estado quebraria a hidratação.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEstado({ ...estadoInicial(), ...salvo });
        }
      }
    } catch {
      /* sem armazenamento, começa do zero */
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    // Gravar a cada tecla digitada serializa o formulário inteiro dezenas de
    // vezes por frase. Meio segundo de espera basta para guardar só o resultado.
    const relogio = window.setTimeout(() => {
      try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
      } catch {
        /* cota cheia ou navegador anônimo: seguir sem salvar */
      }
    }, 500);
    return () => window.clearTimeout(relogio);
  }, [estado, carregado]);

  /* -------------------------------------------------------------- derivação */

  const competencias = useMemo<Competencia[]>(
    () =>
      estado.salarios
        .filter((s) => s.mes && (s.valor ?? 0) > 0)
        .map((s) => {
          const [ano, mes] = s.mes.split("-").map(Number);
          return {
            id: s.id,
            ano: ano!,
            mes: mes!,
            salarioCentavos: s.valor as number,
            pagamentos: pagamentosValidos(s.pagamentos),
          };
        }),
    [estado.salarios],
  );

  const obrigacoes = useMemo<Obrigacao[]>(() => {
    const lista: Obrigacao[] = [];
    for (const f of estado.ferias) {
      if (!f.inicio) continue;
      const valor = remuneracaoDasFerias(f);
      if (valor <= 0) continue;
      lista.push({
        id: f.id,
        tipo: "ferias",
        rotulo: `Férias${f.descricao ? ` — ${f.descricao}` : ""}`,
        fundamento: `Vencimento em ${formatarData(vencimentoFerias(f.inicio))}: dois dias antes do início do gozo, em ${formatarData(f.inicio)}, conforme o art. 145 da CLT.`,
        vencimento: vencimentoFerias(f.inicio),
        valorDevidoCentavos: valor,
        pagamentos: pagamentosValidos(f.pagamentos),
        observacao: f.foraDoPeriodoConcessivo
          ? "Valor dobrado porque as férias foram gozadas fora do período concessivo (art. 137 da CLT e Súmula 81 do TST). A dobra não decorre do atraso no pagamento."
          : undefined,
      });
    }
    for (const d of estado.decimos) {
      if ((d.primeira ?? 0) > 0) {
        lista.push({
          id: `${d.id}-1`,
          tipo: "decimoPrimeira",
          rotulo: `13º salário de ${d.ano} — 1ª parcela`,
          fundamento: `Vencimento em ${formatarData(vencimentoDecimoPrimeira(d.ano, estado.feriadosLocais))}: a primeira parcela vai até 30 de novembro (Lei 4.749/1965).`,
          vencimento: vencimentoDecimoPrimeira(d.ano, estado.feriadosLocais),
          valorDevidoCentavos: d.primeira as number,
          pagamentos: pagamentosValidos(d.pagamentosPrimeira),
        });
      }
      if ((d.segunda ?? 0) > 0) {
        lista.push({
          id: `${d.id}-2`,
          tipo: "decimoSegunda",
          rotulo: `13º salário de ${d.ano} — 2ª parcela`,
          fundamento: `Vencimento em ${formatarData(vencimentoDecimoSegunda(d.ano, estado.feriadosLocais))}: a segunda parcela vai até 20 de dezembro (Lei 4.090/1962).`,
          vencimento: vencimentoDecimoSegunda(d.ano, estado.feriadosLocais),
          valorDevidoCentavos: d.segunda as number,
          pagamentos: pagamentosValidos(d.pagamentosSegunda),
        });
      }
    }
    return lista;
  }, [estado.ferias, estado.decimos, estado.feriadosLocais]);

  const fgtsApurado = useMemo<EncargoFGTS[]>(() => {
    if (!estado.fgtsAtivo) return [];
    return estado.fgts
      .filter((f) => f.mes && (f.remuneracao ?? 0) > 0)
      .map((f) => {
        const [ano, mes] = f.mes.split("-").map(Number);
        return apurarFGTS(ano!, mes!, f.remuneracao as number, {
          dataApuracao: estado.dataApuracao,
          dataRecolhimento: f.recolhimento || undefined,
          aprendiz: f.aprendiz,
          feriadosLocais: estado.feriadosLocais,
        });
      });
  }, [estado.fgtsAtivo, estado.fgts, estado.dataApuracao, estado.feriadosLocais]);

  const multaSemClausula = estado.multa.ativa && estado.multa.clausula.trim().length === 0;

  const parametros = useMemo<Parametros>(() => {
    const regionais = feriadosDaRegiao(estado.regiao, anosEnvolvidos(estado));
    return {
      dataApuracao: estado.dataApuracao,
      juros: { ...estado.juros, serie: serieJuros },
      multa: multaSemClausula ? { ...estado.multa, ativa: false } : estado.multa,
      correcao: { ...estado.correcao, serie },
      calendario: {
        regiao: estado.regiao,
        bancarios: estado.bancarios,
        sabadoEhUtil: estado.sabadoEhUtil,
        locais: [...regionais, ...estado.feriadosLocais],
        locaisManuais: estado.feriadosLocais,
      },
      identificacao: estado.identificacao,
    };
  }, [estado, serie, serieJuros, multaSemClausula]);

  const apuracao = useMemo(
    () => apurar(competencias, parametros, { obrigacoes, fgts: fgtsApurado }),
    [competencias, parametros, obrigacoes, fgtsApurado],
  );

  /* ------------------------------------------------------------- índices */

  const mesesDoCalculo = useMemo(() => {
    const doSalario = mesesNecessarios(competencias, estado.dataApuracao);
    const dasObrigacoes = obrigacoes.flatMap((o) =>
      intervaloDeMeses(chaveMesDaData(o.vencimento), chaveMesDaData(estado.dataApuracao)),
    );
    return [...new Set([...doSalario, ...dasObrigacoes])].sort();
  }, [competencias, obrigacoes, estado.dataApuracao]);

  /**
   * Busca uma série no Banco Central. A chamada só parte meio segundo depois da
   * última tecla, e a anterior é cancelada: digitar o salário não dispara uma
   * consulta por dígito.
   */
  const usarSerie = (
    ligado: boolean,
    indice: string,
    aplicar: (valores: Record<string, number>) => void,
    avisarStatus: (s: "ocioso" | "carregando" | "pronto" | "erro") => void,
    avisarTexto: (t: string) => void,
    textoVazio: string,
  ) => {
    if (!ligado || mesesDoCalculo.length === 0) return;
    const de = mesesDoCalculo[0]!;
    const ate = mesesDoCalculo[mesesDoCalculo.length - 1]!;
    const controle = new AbortController();
    const relogio = window.setTimeout(() => {
      avisarStatus("carregando");
      avisarTexto("");
      fetch(`/api/indices?indice=${indice}&de=${de}&ate=${ate}`, { signal: controle.signal })
        .then(async (r) => {
          const dados = await r.json();
          if (!r.ok) throw new Error(dados?.erro ?? "falha");
          const valores = (dados.valores ?? {}) as Record<string, number>;
          aplicar(valores);
          avisarStatus("pronto");
          avisarTexto(
            Object.keys(valores).length === 0
              ? `${dados.aviso ?? "Ainda não há índice publicado para o período."} ${textoVazio}`
              : `${dados.serieNome} — fonte: Banco Central do Brasil${
                  dados.origem === "reserva" ? ", de consulta anterior" : ""
                }.`,
          );
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          avisarStatus("erro");
          avisarTexto("Não foi possível obter o índice agora. Informe o percentual à mão.");
        });
    }, 500);
    return () => {
      window.clearTimeout(relogio);
      controle.abort();
    };
  };

  useEffect(
    () =>
      usarSerie(
        estado.correcao.ativa && estado.correcao.modo === "indice",
        estado.correcao.indice,
        setSerie,
        setStatusIndice,
        setMensagemIndice,
        "A correção fica em zero até a publicação.",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estado.correcao.ativa, estado.correcao.modo, estado.correcao.indice, mesesDoCalculo],
  );

  useEffect(
    () =>
      usarSerie(
        estado.juros.ativo && estado.juros.modo === "serie",
        "TAXA_LEGAL",
        setSerieJuros,
        setStatusJuros,
        setMensagemJuros,
        "Os juros do mês sem publicação ficam de fora e são sinalizados.",
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [estado.juros.ativo, estado.juros.modo, mesesDoCalculo],
  );

  /* ------------------------------------------------------------------ PDF */

  const podeBaixar = apuracao.competencias.length + apuracao.obrigacoes.length > 0;

  const baixarPdf = useCallback(async () => {
    setGerando(true);
    setErroPdf("");
    try {
      const { gerarMemorial, nomeDoArquivo } = await import("@/lib/pdf");
      const bytes = await gerarMemorial(apuracao);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const endereco = URL.createObjectURL(blob);
      const ancora = document.createElement("a");
      ancora.href = endereco;
      ancora.download = nomeDoArquivo(apuracao);
      document.body.appendChild(ancora);
      ancora.click();
      ancora.remove();
      window.setTimeout(() => URL.revokeObjectURL(endereco), 4000);
    } catch {
      setErroPdf("Não foi possível gerar o PDF neste navegador. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }, [apuracao]);

  /* --------------------------------------------------------------- avisos */

  const avisos: { tom: "atencao" | "alerta"; texto: string }[] = [];
  if (multaSemClausula) {
    avisos.push({
      tom: "atencao",
      texto:
        "A multa está ligada mas sem cláusula informada, então não entrou no cálculo. Escreva de qual convenção ou acordo coletivo ela vem.",
    });
  }
  if (apuracao.mesesSemIndice.length > 0) {
    avisos.push({
      tom: "atencao",
      texto: `Não há índice publicado para ${apuracao.mesesSemIndice.join(", ")}. Esses meses ficaram fora da correção, que está subestimada.`,
    });
  }
  const abaixoDoMinimo = competencias.some(
    (c) => c.salarioCentavos > 0 && c.salarioCentavos < SALARIO_MINIMO_2026,
  );
  if (abaixoDoMinimo && estado.identificacao.baseSalarial === "bruto") {
    avisos.push({
      tom: "atencao",
      texto: `Há competência com valor abaixo do salário mínimo de 2026, que é ${formatarMoeda(SALARIO_MINIMO_2026)}. Confira se o valor digitado é mesmo o bruto do mês cheio.`,
    });
  }

  /* ----------------------------------------------------------------- telas */

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 py-8">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-marca text-2xl"
            aria-hidden="true"
          >
            💰
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-texto sm:text-2xl">
              Salarium Debitum
            </h1>
            <p className="text-xs text-suave sm:text-sm">
              Quanto a empresa deve quando paga o trabalhador fora do prazo
            </p>
          </div>
        </div>
        <div className="sem-impressao flex items-center gap-2">
          <TrocaDeTema />
          <Botao
            tamanho="pequeno"
            aoClicar={() => {
              setEstado(exemplo());
              setAba("salario");
            }}
          >
            Ver exemplo
          </Botao>
          <Botao
            tamanho="pequeno"
            aparencia="sutil"
            aoClicar={() => {
              if (confirm("Apagar todos os dados digitados neste navegador?")) {
                setEstado(estadoInicial());
                try {
                  localStorage.removeItem(CHAVE_ARMAZENAMENTO);
                } catch {
                  /* nada a limpar */
                }
              }
            }}
          >
            Limpar
          </Botao>
        </div>
      </header>

      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-suave">
        Para o líder ou gerente que precisa saber o tamanho do problema quando a empresa não
        conseguiu pagar tudo em dia, inclusive quando pagou uma parte na data e o restante dias
        depois. O cálculo acontece no seu navegador: nenhum dado sai deste computador. No fim, você
        baixa um memorial em PDF com datas, prazos, valores e a base legal de cada número.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <nav
            className="sem-impressao grid grid-cols-3 gap-1.5 rounded-2xl border border-borda bg-superficie p-1.5 sm:flex"
            role="tablist"
            aria-label="Seções do cálculo"
          >
            {ABAS.map((item) => (
              <button
                key={item.valor}
                type="button"
                role="tab"
                aria-selected={aba === item.valor}
                onClick={() => setAba(item.valor)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  aba === item.valor
                    ? "bg-marca text-superficie"
                    : "text-suave hover:bg-superficie-2 hover:text-texto"
                }`}
              >
                <span className="mr-1.5" aria-hidden="true">
                  {item.icone}
                </span>
                {item.rotulo}
              </button>
            ))}
          </nav>

          {avisos.map((aviso, indice) => (
            <Aviso key={indice} tom={aviso.tom}>
              {aviso.texto}
            </Aviso>
          ))}

          {aba === "salario" && <AbaSalario estado={estado} alterar={alterar} />}
          {aba === "ferias" && <AbaFerias estado={estado} alterar={alterar} />}
          {aba === "decimo" && <AbaDecimo estado={estado} alterar={alterar} />}
          {aba === "fgts" && <AbaFgts estado={estado} alterar={alterar} />}
          {aba === "criterios" && (
            <AbaCriterios
              estado={estado}
              alterar={alterar}
              statusIndice={statusIndice}
              mensagemIndice={mensagemIndice}
              statusJuros={statusJuros}
              mensagemJuros={mensagemJuros}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <Resumo
            apuracao={apuracao}
            aoBaixar={baixarPdf}
            gerando={gerando}
            podeBaixar={podeBaixar}
          />
          {erroPdf && (
            <div className="mt-3">
              <Aviso tom="alerta">{erroPdf}</Aviso>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-6">
        <Detalhamento apuracao={apuracao} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ aba: salário */

function AbaSalario({
  estado,
  alterar,
}: {
  estado: Estado;
  alterar: (mudanca: Partial<Estado>) => void;
}) {
  const [bruto, setBruto] = useState<number | null>(null);
  const [dependentes, setDependentes] = useState(0);
  const estimativa = bruto ? estimarLiquido(bruto, dependentes) : null;

  const atualizar = (id: string, mudanca: Partial<ItemSalario>) =>
    alterar({
      salarios: estado.salarios.map((s) => (s.id === id ? { ...s, ...mudanca } : s)),
    });

  const adicionar = () => {
    const ultimo = estado.salarios[estado.salarios.length - 1];
    let proximo = mesAnterior(estado.dataApuracao);
    if (ultimo?.mes) {
      const [ano, mes] = ultimo.mes.split("-").map(Number);
      const seguinte = proximoMes(ano!, mes!);
      proximo = chaveMes(seguinte.ano, seguinte.mes);
    }
    alterar({
      salarios: [
        ...estado.salarios,
        { id: novoId(), mes: proximo, valor: ultimo?.valor ?? null, pagamentos: [] },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Salário mensal"
        descricao="Uma competência para cada mês trabalhado. O prazo legal é o 5º dia útil do mês seguinte."
      >
        <div className="space-y-4">
          {estado.salarios.map((item) => {
            const [ano, mes] = item.mes ? item.mes.split("-").map(Number) : [0, 0];
            const rotulo = ano ? `${nomeDoMes(mes!)} de ${ano}` : "competência sem mês";
            return (
              <div key={item.id} className="rounded-2xl border border-borda p-4">
                <CabecalhoItem
                  titulo={rotulo}
                  aoRemover={() =>
                    alterar({ salarios: estado.salarios.filter((s) => s.id !== item.id) })
                  }
                />
                <Grade>
                  <CampoTexto
                    rotulo="Mês trabalhado"
                    tipo="month"
                    valor={item.mes}
                    aoMudar={(v) => atualizar(item.id, { mes: v })}
                    ajuda="o mês do serviço, não o mês do pagamento"
                  />
                  <CampoMoeda
                    rotulo="Valor devido no mês"
                    centavos={item.valor}
                    aoMudar={(v) => atualizar(item.id, { valor: v })}
                    ajuda="o que o trabalhador tinha a receber"
                  />
                </Grade>
                <ListaPagamentos
                  linhas={item.pagamentos}
                  aoMudar={(linhas) => atualizar(item.id, { pagamentos: linhas })}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Botao aoClicar={adicionar}>+ Adicionar competência</Botao>
        </div>
      </Cartao>

      <Cartao
        titulo="Não sabe o valor líquido?"
        descricao="Estimativa rápida a partir do salário bruto, com as tabelas de 2026."
      >
        <Grade>
          <CampoMoeda rotulo="Salário bruto" centavos={bruto} aoMudar={setBruto} />
          <CampoNumero
            rotulo="Dependentes"
            valor={dependentes}
            aoMudar={setDependentes}
            passo={1}
          />
        </Grade>
        {estimativa && (
          <div className="mt-4 space-y-1 rounded-xl border border-borda bg-superficie-2 p-3 text-sm">
            <p className="flex justify-between">
              <span className="text-suave">INSS</span>
              <span className="tabular-nums">− {formatarMoeda(estimativa.inssCentavos)}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-suave">Imposto de renda</span>
              <span className="tabular-nums">− {formatarMoeda(estimativa.irrfCentavos)}</span>
            </p>
            <p className="flex justify-between border-t border-borda pt-1 font-semibold">
              <span>Líquido estimado</span>
              <span className="tabular-nums">{formatarMoeda(estimativa.liquidoCentavos)}</span>
            </p>
          </div>
        )}
        <div className="mt-3">
          <NotaLegal titulo="O que esta estimativa não inclui">
            Entram apenas a contribuição previdenciária pela tabela da Portaria Interministerial
            MPS/MF 13/2026 e o imposto de renda pela tabela de 2026 com o redutor da Lei
            15.270/2025. Ficam de fora vale-transporte, plano de saúde, adiantamentos, pensão
            alimentícia, faltas e qualquer outro desconto do contracheque.
          </NotaLegal>
        </div>
      </Cartao>
    </div>
  );
}

/* -------------------------------------------------------------- aba: férias */

function AbaFerias({
  estado,
  alterar,
}: {
  estado: Estado;
  alterar: (mudanca: Partial<Estado>) => void;
}) {
  const atualizar = (id: string, mudanca: Partial<ItemFerias>) =>
    alterar({ ferias: estado.ferias.map((f) => (f.id === id ? { ...f, ...mudanca } : f)) });

  const adicionar = () =>
    alterar({
      ferias: [
        ...estado.ferias,
        {
          id: novoId(),
          descricao: "",
          inicio: "",
          modo: "calcular",
          salarioBase: estado.salarios[0]?.valor ?? null,
          dias: 30,
          diasVendidos: 0,
          valorInformado: null,
          foraDoPeriodoConcessivo: false,
          pagamentos: [],
        },
      ],
    });

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Férias"
        descricao="A remuneração das férias vence dois dias antes do início do descanso."
        acao={<Botao tamanho="pequeno" aoClicar={adicionar}>+ Adicionar período</Botao>}
      >
        {estado.ferias.length === 0 && (
          <p className="text-sm text-suave">
            Nenhum período de férias informado. Use esta aba quando o trabalhador saiu de férias sem
            receber, ou recebeu depois do prazo.
          </p>
        )}

        <div className="space-y-4">
          {estado.ferias.map((item) => {
            const calculo = calcularRemuneracaoFerias(
              item.salarioBase ?? 0,
              item.dias,
              item.diasVendidos,
            );
            const total = remuneracaoDasFerias(item);
            return (
              <div key={item.id} className="rounded-2xl border border-borda p-4">
                <CabecalhoItem
                  titulo={item.descricao || "Período de férias"}
                  etiqueta={
                    item.inicio ? `vence em ${formatarData(vencimentoFerias(item.inicio))}` : undefined
                  }
                  aoRemover={() =>
                    alterar({ ferias: estado.ferias.filter((f) => f.id !== item.id) })
                  }
                />
                <Grade>
                  <CampoTexto
                    rotulo="Período aquisitivo"
                    valor={item.descricao}
                    aoMudar={(v) => atualizar(item.id, { descricao: v })}
                    placeholder="ex.: 2024/2025"
                  />
                  <CampoTexto
                    rotulo="Início do descanso"
                    tipo="date"
                    valor={item.inicio}
                    aoMudar={(v) => atualizar(item.id, { inicio: v })}
                    ajuda="o primeiro dia de férias"
                  />
                </Grade>

                <div className="mt-4">
                  <Selecao
                    rotulo="Como informar o valor"
                    valor={item.modo}
                    aoMudar={(v) => atualizar(item.id, { modo: v })}
                    opcoes={[
                      { valor: "calcular", rotulo: "Calcular a partir do salário" },
                      { valor: "informar", rotulo: "Informar o valor total das férias" },
                    ]}
                  />
                </div>

                {item.modo === "calcular" ? (
                  <>
                    <div className="mt-4">
                      <Grade colunas={3}>
                        <CampoMoeda
                          rotulo="Salário mensal"
                          centavos={item.salarioBase}
                          aoMudar={(v) => atualizar(item.id, { salarioBase: v })}
                        />
                        <CampoNumero
                          rotulo="Dias de descanso"
                          valor={item.dias}
                          aoMudar={(v) => atualizar(item.id, { dias: v })}
                          passo={1}
                          sufixo="dias"
                        />
                        <CampoNumero
                          rotulo="Dias vendidos"
                          valor={item.diasVendidos}
                          aoMudar={(v) => atualizar(item.id, { diasVendidos: v })}
                          passo={1}
                          sufixo="dias"
                          ajuda="abono pecuniário, até 10"
                        />
                      </Grade>
                    </div>
                    <div className="mt-3 rounded-xl border border-borda bg-superficie-2 p-3 text-sm">
                      <p className="flex justify-between">
                        <span className="text-suave">Férias</span>
                        <span className="tabular-nums">
                          {formatarMoeda(calculo.feriasCentavos)}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-suave">Terço constitucional</span>
                        <span className="tabular-nums">
                          {formatarMoeda(calculo.tercoFeriasCentavos)}
                        </span>
                      </p>
                      {calculo.abonoCentavos > 0 && (
                        <p className="flex justify-between">
                          <span className="text-suave">Abono e terço sobre o abono</span>
                          <span className="tabular-nums">
                            {formatarMoeda(calculo.abonoCentavos + calculo.tercoAbonoCentavos)}
                          </span>
                        </p>
                      )}
                      <p className="mt-1 flex justify-between border-t border-borda pt-1 font-semibold">
                        <span>Total a receber</span>
                        <span className="tabular-nums">{formatarMoeda(total)}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <CampoMoeda
                      rotulo="Valor total das férias"
                      centavos={item.valorInformado}
                      aoMudar={(v) => atualizar(item.id, { valorInformado: v })}
                      ajuda="já com o terço constitucional"
                    />
                  </div>
                )}

                <div className="mt-4">
                  <Interruptor
                    ligado={item.foraDoPeriodoConcessivo}
                    aoMudar={(v) => atualizar(item.id, { foraDoPeriodoConcessivo: v })}
                    titulo="Férias gozadas fora do período concessivo"
                    descricao="Dobra a remuneração, conforme o art. 137 da CLT e a Súmula 81 do TST. Marque apenas se o descanso começou depois dos 12 meses seguintes ao período aquisitivo."
                  />
                </div>

                <ListaPagamentos
                  linhas={item.pagamentos}
                  aoMudar={(linhas) => atualizar(item.id, { pagamentos: linhas })}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <NotaLegal titulo="Por que não há pagamento em dobro por atraso nas férias">
            A Súmula 450 do TST previa a dobra quando a empresa pagava as férias fora do prazo do
            art. 145 da CLT. O Supremo Tribunal Federal declarou essa súmula inconstitucional no
            julgamento da ADPF 501, em 16 de setembro de 2022, por aplicar a punição de um artigo a
            uma hipótese diferente. Sobre o atraso no pagamento incidem juros e correção, e a multa
            que a convenção coletiva da categoria previr. A dobra do art. 137 continua valendo em
            outra situação: férias concedidas depois do período concessivo.
          </NotaLegal>
        </div>
      </Cartao>
    </div>
  );
}

/* --------------------------------------------------------------- aba: 13º */

function AbaDecimo({
  estado,
  alterar,
}: {
  estado: Estado;
  alterar: (mudanca: Partial<Estado>) => void;
}) {
  const atualizar = (id: string, mudanca: Partial<ItemDecimo>) =>
    alterar({ decimos: estado.decimos.map((d) => (d.id === id ? { ...d, ...mudanca } : d)) });

  const adicionar = () =>
    alterar({
      decimos: [
        ...estado.decimos,
        {
          id: novoId(),
          ano: Number(estado.dataApuracao.slice(0, 4)) - 1,
          primeira: null,
          pagamentosPrimeira: [],
          segunda: null,
          pagamentosSegunda: [],
        },
      ],
    });

  return (
    <Cartao
      titulo="Décimo terceiro salário"
      descricao="Primeira parcela até 30 de novembro, segunda até 20 de dezembro."
      acao={<Botao tamanho="pequeno" aoClicar={adicionar}>+ Adicionar ano</Botao>}
    >
      {estado.decimos.length === 0 && (
        <p className="text-sm text-suave">
          Nenhum décimo terceiro informado. Preencha o ano e o valor de cada parcela que ficou para
          trás.
        </p>
      )}

      <div className="space-y-4">
        {estado.decimos.map((item) => (
          <div key={item.id} className="rounded-2xl border border-borda p-4">
            <CabecalhoItem
              titulo={`13º salário de ${item.ano}`}
              aoRemover={() => alterar({ decimos: estado.decimos.filter((d) => d.id !== item.id) })}
            />
            <Grade colunas={3}>
              <CampoNumero
                rotulo="Ano"
                valor={item.ano}
                aoMudar={(v) => atualizar(item.id, { ano: Math.round(v) })}
                passo={1}
                minimo={1990}
              />
              <CampoMoeda
                rotulo="1ª parcela"
                centavos={item.primeira}
                aoMudar={(v) => atualizar(item.id, { primeira: v })}
                ajuda={`vence em ${formatarData(vencimentoDecimoPrimeira(item.ano, estado.feriadosLocais))}`}
              />
              <CampoMoeda
                rotulo="2ª parcela"
                centavos={item.segunda}
                aoMudar={(v) => atualizar(item.id, { segunda: v })}
                ajuda={`vence em ${formatarData(vencimentoDecimoSegunda(item.ano, estado.feriadosLocais))}`}
              />
            </Grade>

            <ListaPagamentos
              rotulo="Pagamentos da 1ª parcela"
              linhas={item.pagamentosPrimeira}
              aoMudar={(linhas) => atualizar(item.id, { pagamentosPrimeira: linhas })}
            />
            <ListaPagamentos
              rotulo="Pagamentos da 2ª parcela"
              linhas={item.pagamentosSegunda}
              aoMudar={(linhas) => atualizar(item.id, { pagamentosSegunda: linhas })}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <NotaLegal titulo="Como a lei divide o décimo terceiro">
          A Lei 4.090/1962 manda pagar a gratificação até 20 de dezembro. A Lei 4.749/1965 permite
          adiantar metade entre fevereiro e 30 de novembro, e essa antecipação é obrigatória quando o
          trabalhador pede no mês de janeiro. Os descontos de INSS e imposto de renda incidem sobre a
          segunda parcela. O atraso não gera multa automática em favor do empregado: gera juros,
          correção e a multa que a convenção coletiva previr.
        </NotaLegal>
      </div>
    </Cartao>
  );
}

/* -------------------------------------------------------------- aba: FGTS */

function AbaFgts({
  estado,
  alterar,
}: {
  estado: Estado;
  alterar: (mudanca: Partial<Estado>) => void;
}) {
  const atualizar = (id: string, mudanca: Partial<ItemFgts>) =>
    alterar({ fgts: estado.fgts.map((f) => (f.id === id ? { ...f, ...mudanca } : f)) });

  const importar = () =>
    alterar({
      fgtsAtivo: true,
      fgts: estado.salarios
        .filter((s) => s.mes && (s.valor ?? 0) > 0)
        .map((s) => ({
          id: novoId(),
          mes: s.mes,
          remuneracao: s.valor,
          recolhimento: "" as const,
          aprendiz: false,
        })),
    });

  return (
    <Cartao
      titulo="FGTS recolhido em atraso"
      descricao="Oito por cento da remuneração de cada mês, com vencimento no dia 20 do mês seguinte."
    >
      <Interruptor
        ligado={estado.fgtsAtivo}
        aoMudar={(v) => alterar({ fgtsAtivo: v })}
        titulo="Calcular também o FGTS"
        descricao="O depósito é devido sobre a remuneração do mês, mesmo que o salário tenha sido pago com atraso."
      />

      {estado.fgtsAtivo && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Botao
              tamanho="pequeno"
              aoClicar={() =>
                alterar({
                  fgts: [
                    ...estado.fgts,
                    {
                      id: novoId(),
                      mes: mesAnterior(estado.dataApuracao),
                      remuneracao: null,
                      recolhimento: "",
                      aprendiz: false,
                    },
                  ],
                })
              }
            >
              + Adicionar competência
            </Botao>
            {estado.salarios.some((s) => (s.valor ?? 0) > 0) && (
              <Botao tamanho="pequeno" aparencia="sutil" aoClicar={importar}>
                Copiar da aba Salário
              </Botao>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {estado.fgts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-borda p-4">
                <CabecalhoItem
                  titulo={item.mes || "competência"}
                  aoRemover={() => alterar({ fgts: estado.fgts.filter((f) => f.id !== item.id) })}
                />
                <Grade colunas={3}>
                  <CampoTexto
                    rotulo="Mês trabalhado"
                    tipo="month"
                    valor={item.mes}
                    aoMudar={(v) => atualizar(item.id, { mes: v })}
                  />
                  <CampoMoeda
                    rotulo="Remuneração do mês"
                    centavos={item.remuneracao}
                    aoMudar={(v) => atualizar(item.id, { remuneracao: v })}
                    ajuda="valor bruto, base do depósito"
                  />
                  <CampoTexto
                    rotulo="Data do recolhimento"
                    tipo="date"
                    valor={item.recolhimento}
                    aoMudar={(v) => atualizar(item.id, { recolhimento: v as DataISO })}
                    ajuda="deixe vazio se ainda não recolheu"
                  />
                </Grade>
                <div className="mt-3">
                  <Interruptor
                    ligado={item.aprendiz}
                    aoMudar={(v) => atualizar(item.id, { aprendiz: v })}
                    titulo="Contrato de aprendizagem"
                    descricao="A alíquota cai de 8% para 2%."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <NotaLegal titulo="De onde vêm os encargos do FGTS">
              O art. 15 da Lei 8.036/1990 manda depositar 8% da remuneração paga ou devida no mês
              anterior, até o dia 20. O art. 22 da mesma lei cobra do atraso juros de mora de 0,5% ao
              mês ou fração, multa de 5% no mês do vencimento e de 10% a partir do mês seguinte, além
              da atualização pela TR, que este cálculo não inclui. O valor vai para a conta vinculada
              do trabalhador, não para a mão dele.
            </NotaLegal>
          </div>
        </>
      )}
    </Cartao>
  );
}

/* ---------------------------------------------------------- aba: critérios */

function AbaCriterios({
  estado,
  alterar,
  statusIndice,
  mensagemIndice,
  statusJuros,
  mensagemJuros,
}: {
  estado: Estado;
  alterar: (mudanca: Partial<Estado>) => void;
  statusIndice: "ocioso" | "carregando" | "pronto" | "erro";
  mensagemIndice: string;
  statusJuros: "ocioso" | "carregando" | "pronto" | "erro";
  mensagemJuros: string;
}) {
  return (
    <div className="space-y-4">
      <Cartao titulo="Data da apuração" descricao="Os juros correm até esta data.">
        <Grade>
          <CampoTexto
            rotulo="Calcular até"
            tipo="date"
            valor={estado.dataApuracao}
            aoMudar={(v) => alterar({ dataApuracao: v })}
          />
          <Selecao
            rotulo="O valor digitado é"
            valor={estado.identificacao.baseSalarial}
            aoMudar={(v) =>
              alterar({ identificacao: { ...estado.identificacao, baseSalarial: v } })
            }
            opcoes={[
              { valor: "liquido", rotulo: "Líquido, o que cai na conta" },
              { valor: "bruto", rotulo: "Bruto, antes dos descontos" },
            ]}
          />
        </Grade>
      </Cartao>

      <Cartao titulo="Juros de mora" descricao="Simples, proporcionais aos dias de atraso.">
        <Interruptor
          ligado={estado.juros.ativo}
          aoMudar={(v) => alterar({ juros: { ...estado.juros, ativo: v } })}
          titulo="Aplicar juros de mora"
          descricao="Desligue apenas se quiser ver só o principal em aberto."
        />
        {estado.juros.ativo && (
          <div className="mt-4 space-y-4">
            <Selecao
              rotulo="Como calcular os juros"
              valor={estado.juros.modo}
              aoMudar={(v) =>
                alterar({
                  juros: {
                    ...estado.juros,
                    modo: v,
                    fundamento:
                      v === "serie"
                        ? "art. 406 do Código Civil, com a redação da Lei 14.905/2024"
                        : "art. 39 da Lei 8.177/1991",
                  },
                })
              }
              opcoes={[
                { valor: "fixa", rotulo: "Taxa fixa ao mês" },
                { valor: "serie", rotulo: "Taxa legal: Selic menos IPCA, mês a mês" },
              ]}
              ajuda={
                estado.juros.modo === "serie"
                  ? "cada mês entra com a sua própria taxa, buscada no Banco Central"
                  : "a mesma taxa em todo o período, pelo mês comercial de 30 dias"
              }
            />
            <Grade>
              {estado.juros.modo === "fixa" && (
                <CampoNumero
                  rotulo="Taxa ao mês"
                  valor={estado.juros.taxaMesPct}
                  aoMudar={(v) => alterar({ juros: { ...estado.juros, taxaMesPct: v } })}
                  sufixo="% a.m."
                  passo={0.1}
                />
              )}
              <CampoTexto
                rotulo="Fundamento"
                valor={estado.juros.fundamento}
                aoMudar={(v) => alterar({ juros: { ...estado.juros, fundamento: v } })}
                ajuda="aparece no memorial ao lado da taxa"
              />
            </Grade>
            {estado.juros.modo === "serie" && (
              <p className="text-xs text-suave">
                {statusJuros === "carregando" && "Consultando a Selic e o IPCA no Banco Central..."}
                {statusJuros === "pronto" && mensagemJuros}
                {statusJuros === "erro" && <span className="text-alerta">{mensagemJuros}</span>}
                {statusJuros === "ocioso" &&
                  "A consulta acontece assim que houver parcela com valor."}
              </p>
            )}
          </div>
        )}
        <div className="mt-4">
          <NotaLegal titulo="Por que 1% ao mês">
            O art. 39 da Lei 8.177/1991 trata dos juros sobre débitos trabalhistas não pagos na época
            própria e fixa 1% ao mês, sem capitalização, para o crédito cobrado na Justiça do
            Trabalho. Para dívidas em geral, a Lei 14.905/2024 mudou o art. 406 do Código Civil: a
            taxa legal passou a ser a Selic menos o IPCA, e o TST padronizou esse critério para a
            fase judicial a partir de 30 de agosto de 2024. Como a taxa varia mês a mês, o campo
            acima aceita o percentual que você precisar usar.
          </NotaLegal>
        </div>
      </Cartao>

      <Cartao
        titulo="Multa"
        descricao="Nasce desligada. Não existe multa legal automática pelo atraso do salário mensal."
      >
        <Interruptor
          ligado={estado.multa.ativa}
          aoMudar={(v) => alterar({ multa: { ...estado.multa, ativa: v } })}
          titulo="Aplicar multa prevista em norma coletiva"
          descricao="Só ligue se a convenção ou o acordo coletivo da categoria previr multa pelo atraso."
        />
        {estado.multa.ativa && (
          <div className="mt-4 space-y-4">
            <CampoTexto
              rotulo="Cláusula que institui a multa"
              valor={estado.multa.clausula}
              aoMudar={(v) => alterar({ multa: { ...estado.multa, clausula: v } })}
              placeholder="ex.: CCT 2026/2027, cláusula 15ª, parágrafo único"
              erro={
                estado.multa.clausula.trim() === ""
                  ? "Sem a cláusula a multa não entra no cálculo."
                  : undefined
              }
            />
            <Grade colunas={2}>
              <Selecao
                rotulo="Como a multa é calculada"
                valor={estado.multa.tipo}
                aoMudar={(v) => alterar({ multa: { ...estado.multa, tipo: v } })}
                opcoes={[
                  { valor: "percentual", rotulo: "Percentual sobre o valor" },
                  { valor: "salarioDia", rotulo: "Salários-dia por dia de atraso" },
                  { valor: "fixo", rotulo: "Valor fixo por competência" },
                ]}
              />
              <Selecao
                rotulo="Incide sobre"
                valor={estado.multa.base}
                aoMudar={(v) => alterar({ multa: { ...estado.multa, base: v } })}
                opcoes={[
                  { valor: "atraso", rotulo: "O valor pago em atraso e o saldo" },
                  { valor: "salario", rotulo: "O valor devido da competência" },
                ]}
              />
            </Grade>
            <Grade colunas={2}>
              {estado.multa.tipo === "fixo" ? (
                <CampoMoeda
                  rotulo="Valor da multa"
                  centavos={estado.multa.valor}
                  aoMudar={(v) => alterar({ multa: { ...estado.multa, valor: v ?? 0 } })}
                />
              ) : (
                <CampoNumero
                  rotulo={estado.multa.tipo === "percentual" ? "Percentual" : "Salários-dia por dia"}
                  valor={estado.multa.valor}
                  aoMudar={(v) => alterar({ multa: { ...estado.multa, valor: v } })}
                  sufixo={estado.multa.tipo === "percentual" ? "%" : "x"}
                  passo={estado.multa.tipo === "percentual" ? 0.5 : 0.1}
                />
              )}
              <CampoNumero
                rotulo="Teto, em percentual do valor devido"
                valor={estado.multa.tetoPercentual ?? 0}
                aoMudar={(v) =>
                  alterar({ multa: { ...estado.multa, tetoPercentual: v > 0 ? v : null } })
                }
                sufixo="%"
                passo={5}
                ajuda="zero significa sem teto"
              />
            </Grade>
          </div>
        )}
        <div className="mt-4">
          <NotaLegal titulo="O que a lei prevê e o que não prevê">
            A CLT não cria multa automática em favor do empregado pelo atraso do salário mensal. A
            multa do art. 477, §8º, é das verbas rescisórias, e a do art. 467 vale para a parcela
            incontroversa discutida em juízo. O que existe na esfera administrativa é multa aplicada
            pela fiscalização do trabalho, hoje em R$ 176,03 por trabalhador prejudicado, dobrada em
            caso de reincidência — e esse valor vai para a União, não para o trabalhador. A multa que
            o empregado recebe vem da convenção coletiva da categoria.
          </NotaLegal>
        </div>
      </Cartao>

      <Cartao titulo="Correção monetária" descricao="Recompõe a inflação do período.">
        <Interruptor
          ligado={estado.correcao.ativa}
          aoMudar={(v) => alterar({ correcao: { ...estado.correcao, ativa: v } })}
          titulo="Aplicar correção monetária"
          descricao="Súmula 381 do TST: o índice corre a partir do dia 1º do mês do vencimento."
        />
        {estado.correcao.ativa && (
          <div className="mt-4 space-y-4">
            <Grade colunas={2}>
              <Selecao
                rotulo="Origem do índice"
                valor={estado.correcao.modo}
                aoMudar={(v) => alterar({ correcao: { ...estado.correcao, modo: v } })}
                opcoes={[
                  { valor: "indice", rotulo: "Buscar no Banco Central" },
                  { valor: "manual", rotulo: "Informar o percentual à mão" },
                ]}
              />
              {estado.correcao.modo === "indice" ? (
                <Selecao
                  rotulo="Índice"
                  valor={estado.correcao.indice}
                  aoMudar={(v) => alterar({ correcao: { ...estado.correcao, indice: v } })}
                  opcoes={[
                    { valor: "IPCA", rotulo: "IPCA (IBGE)" },
                    { valor: "INPC", rotulo: "INPC (IBGE)" },
                    { valor: "IGPM", rotulo: "IGP-M (FGV)" },
                  ]}
                />
              ) : (
                <CampoNumero
                  rotulo="Percentual acumulado"
                  valor={estado.correcao.percentualManual}
                  aoMudar={(v) => alterar({ correcao: { ...estado.correcao, percentualManual: v } })}
                  sufixo="%"
                  passo={0.1}
                />
              )}
            </Grade>
            {estado.correcao.modo === "indice" && (
              <p className="text-xs text-suave">
                {statusIndice === "carregando" && "Consultando o Banco Central..."}
                {statusIndice === "pronto" && mensagemIndice}
                {statusIndice === "erro" && (
                  <span className="text-alerta">{mensagemIndice}</span>
                )}
                {statusIndice === "ocioso" &&
                  "A consulta acontece assim que houver competência com valor."}
              </p>
            )}
          </div>
        )}
      </Cartao>

      <Cartao
        titulo="Calendário e feriados"
        descricao="O feriado muda o 5º dia útil e, com ele, a contagem do atraso."
      >
        <Grade>
          <Selecao
            rotulo="Região"
            valor={estado.regiao}
            aoMudar={(v) => alterar({ regiao: v })}
            opcoes={REGIOES.map((r) => ({ valor: r.valor, rotulo: r.rotulo }))}
            ajuda={REGIOES.find((r) => r.valor === estado.regiao)?.descricao}
          />
        </Grade>
        <div className="mt-4 space-y-3">
          <Interruptor
            ligado={estado.sabadoEhUtil}
            aoMudar={(v) => alterar({ sabadoEhUtil: v })}
            titulo="Contar sábado como dia útil"
            descricao="É o critério aplicado ao art. 459 da CLT: excluem-se apenas domingos e feriados."
          />
          <Interruptor
            ligado={estado.bancarios}
            aoMudar={(v) => alterar({ bancarios: v })}
            titulo="Excluir Carnaval e Corpus Christi"
            descricao="Não são feriados nacionais por lei, mas não há expediente bancário nessas datas."
          />
        </div>
        <div className="mt-4">
          <NotaLegal titulo="Por que a região aparece num cálculo trabalhista">
            Direito do trabalho é competência da União: o prazo do 5º dia útil, os juros e a correção
            valem igual no país inteiro. O que muda de uma cidade para outra é o calendário de
            feriados, e isso desloca o 5º dia útil. Em São Paulo entram o 9 de julho, feriado
            estadual pela Lei 9.497/1997, e, na capital, o 25 de janeiro, feriado municipal pela Lei
            14.485/2007. O outro ponto local é a convenção coletiva da categoria, que você informa na
            aba de critérios.
          </NotaLegal>
        </div>
      </Cartao>

      <Cartao
        titulo="Identificação"
        descricao="Aparece no memorial. Preencher é opcional e nada sai deste navegador."
      >
        <Grade>
          <CampoTexto
            rotulo="Empresa"
            valor={estado.identificacao.empresa}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, empresa: v } })}
          />
          <CampoTexto
            rotulo="CNPJ"
            valor={estado.identificacao.cnpj}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, cnpj: v } })}
          />
          <CampoTexto
            rotulo="Empregado"
            valor={estado.identificacao.empregado}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, empregado: v } })}
          />
          <CampoTexto
            rotulo="Cargo"
            valor={estado.identificacao.cargo}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, cargo: v } })}
          />
          <CampoTexto
            rotulo="Quem está calculando"
            valor={estado.identificacao.responsavel}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, responsavel: v } })}
          />
          <CampoTexto
            rotulo="Observações"
            valor={estado.identificacao.observacoes}
            aoMudar={(v) => alterar({ identificacao: { ...estado.identificacao, observacoes: v } })}
          />
        </Grade>
      </Cartao>
    </div>
  );
}
