/**
 * Memorial de cálculo em PDF, montado inteiramente no navegador.
 *
 * Fontes padrão do PDF codificam apenas WinAnsi. Todo texto passa pelo
 * saneador antes de ser desenhado: o que existe em WinAnsi vai direto, o que
 * tem equivalente legível é transliterado e o que sobra vira um "?" visível.
 * Descartar em silêncio seria a pior falha possível num documento que alguém
 * vai levar a uma negociação.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "@cantoo/pdf-lib";

import { formatarData, formatarCompetencia } from "./data";
import { formatarMoeda, formatarNumero, formatarPercentual } from "./dinheiro";
import { rotuloDaRegiao } from "./regiao";
import type { Apuracao, CompetenciaApurada, ObrigacaoApurada } from "./tipos";

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = { esquerda: 46, direita: 46, topo: 54, base: 62 };
const LARGURA_UTIL = A4.largura - MARGEM.esquerda - MARGEM.direita;

const TINTA = {
  texto: rgb(0.11, 0.13, 0.17),
  suave: rgb(0.42, 0.45, 0.5),
  linha: rgb(0.85, 0.87, 0.9),
  faixa: rgb(0.96, 0.97, 0.98),
  destaque: rgb(0.05, 0.37, 0.33),
  alerta: rgb(0.7, 0.16, 0.16),
  marca: rgb(0.06, 0.3, 0.27),
};

/* ------------------------------------------------------------------ texto */

const EXTRAS_WINANSI = new Set(
  [
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039,
    0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122,
    0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
  ],
);

const TRANSLITERACAO: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "→": "->",
  "←": "<-",
  "⇒": "=>",
  "−": "-",
  "–": "-",
  "—": "-",
  "∞": "infinito",
  "≈": "~",
  "≠": "!=",
  "…": "...",
  "\u00a0": " ",
  "\u2007": " ",
  "\u202f": " ",
};

export function sanear(entrada: string): string {
  let saida = "";
  for (const ch of entrada ?? "") {
    const codigo = ch.codePointAt(0)!;
    if (codigo === 10 || codigo === 13) {
      saida += " ";
      continue;
    }
    if ((codigo >= 0x20 && codigo <= 0x7e) || (codigo >= 0xa0 && codigo <= 0xff)) {
      saida += ch;
      continue;
    }
    if (EXTRAS_WINANSI.has(codigo)) {
      saida += ch;
      continue;
    }
    const alternativa = TRANSLITERACAO[ch];
    saida += alternativa !== undefined ? alternativa : "?";
  }
  return saida;
}

/* --------------------------------------------------------------- desenho */

interface Pincel {
  doc: PDFDocument;
  pagina: PDFPage;
  paginas: PDFPage[];
  y: number;
  regular: PDFFont;
  negrito: PDFFont;
  italico: PDFFont;
}

function novaPagina(p: Pincel) {
  p.pagina = p.doc.addPage([A4.largura, A4.altura]);
  p.paginas.push(p.pagina);
  p.y = A4.altura - MARGEM.topo;
}

function espacoRestante(p: Pincel) {
  return p.y - MARGEM.base;
}

function garantirEspaco(p: Pincel, altura: number) {
  if (espacoRestante(p) < altura) novaPagina(p);
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const palavras = sanear(texto).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [""];
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

interface OpcoesTexto {
  tamanho?: number;
  fonte?: "regular" | "negrito" | "italico";
  cor?: ReturnType<typeof rgb>;
  x?: number;
  largura?: number;
  entrelinha?: number;
  espacoDepois?: number;
}

function paragrafo(p: Pincel, texto: string, opcoes: OpcoesTexto = {}) {
  const tamanho = opcoes.tamanho ?? 9.5;
  const fonte = opcoes.fonte === "negrito" ? p.negrito : opcoes.fonte === "italico" ? p.italico : p.regular;
  const x = opcoes.x ?? MARGEM.esquerda;
  const largura = opcoes.largura ?? LARGURA_UTIL;
  const entrelinha = opcoes.entrelinha ?? tamanho * 1.42;
  const linhas = quebrar(texto, fonte, tamanho, largura);
  for (const linha of linhas) {
    garantirEspaco(p, entrelinha);
    p.y -= entrelinha;
    p.pagina.drawText(linha, {
      x,
      y: p.y,
      size: tamanho,
      font: fonte,
      color: opcoes.cor ?? TINTA.texto,
    });
  }
  p.y -= opcoes.espacoDepois ?? 0;
}

function titulo(p: Pincel, texto: string) {
  garantirEspaco(p, 40);
  p.y -= 18;
  p.pagina.drawText(sanear(texto).toUpperCase(), {
    x: MARGEM.esquerda,
    y: p.y,
    size: 10,
    font: p.negrito,
    color: TINTA.marca,
  });
  p.y -= 6;
  p.pagina.drawLine({
    start: { x: MARGEM.esquerda, y: p.y },
    end: { x: A4.largura - MARGEM.direita, y: p.y },
    thickness: 1,
    color: TINTA.marca,
  });
  p.y -= 6;
}

interface Coluna {
  titulo: string;
  largura: number;
  alinhamento?: "esquerda" | "direita";
}

function desenharCelula(
  p: Pincel,
  texto: string,
  x: number,
  y: number,
  coluna: Coluna,
  fonte: PDFFont,
  tamanho: number,
  cor: ReturnType<typeof rgb>,
) {
  const conteudo = sanear(texto);
  const largura = fonte.widthOfTextAtSize(conteudo, tamanho);
  const px = coluna.alinhamento === "direita" ? x + coluna.largura - largura - 4 : x + 4;
  p.pagina.drawText(conteudo, { x: px, y, size: tamanho, font: fonte, color: cor });
}

function tabela(p: Pincel, colunas: Coluna[], linhas: string[][], opcoes: { tamanho?: number } = {}) {
  const tamanho = opcoes.tamanho ?? 8.2;
  const alturaLinha = tamanho * 1.85;

  const cabecalho = () => {
    garantirEspaco(p, alturaLinha * 2);
    p.y -= alturaLinha;
    let x = MARGEM.esquerda;
    p.pagina.drawRectangle({
      x: MARGEM.esquerda,
      y: p.y - 3,
      width: LARGURA_UTIL,
      height: alturaLinha,
      color: TINTA.faixa,
    });
    for (const coluna of colunas) {
      desenharCelula(p, coluna.titulo, x, p.y, coluna, p.negrito, tamanho, TINTA.suave);
      x += coluna.largura;
    }
    p.y -= 4;
    p.pagina.drawLine({
      start: { x: MARGEM.esquerda, y: p.y },
      end: { x: A4.largura - MARGEM.direita, y: p.y },
      thickness: 0.6,
      color: TINTA.linha,
    });
  };

  cabecalho();
  for (const linha of linhas) {
    if (espacoRestante(p) < alturaLinha + 10) {
      novaPagina(p);
      cabecalho();
    }
    p.y -= alturaLinha;
    let x = MARGEM.esquerda;
    for (let i = 0; i < colunas.length; i += 1) {
      desenharCelula(p, linha[i] ?? "", x, p.y, colunas[i]!, p.regular, tamanho, TINTA.texto);
      x += colunas[i]!.largura;
    }
    p.y -= 3;
    p.pagina.drawLine({
      start: { x: MARGEM.esquerda, y: p.y },
      end: { x: A4.largura - MARGEM.direita, y: p.y },
      thickness: 0.4,
      color: TINTA.linha,
    });
  }
}

function paresDeDados(p: Pincel, pares: [string, string][]) {
  const colunaLargura = LARGURA_UTIL / 2 - 10;
  const tamanho = 9;
  for (let i = 0; i < pares.length; i += 2) {
    garantirEspaco(p, 26);
    p.y -= 15;
    const linha = [pares[i], pares[i + 1]];
    linha.forEach((par, indice) => {
      if (!par) return;
      const x = MARGEM.esquerda + indice * (colunaLargura + 20);
      p.pagina.drawText(sanear(par[0]), {
        x,
        y: p.y,
        size: 7.4,
        font: p.negrito,
        color: TINTA.suave,
      });
      const valor = quebrar(par[1], p.regular, tamanho, colunaLargura)[0] ?? "";
      p.pagina.drawText(valor, {
        x,
        y: p.y - 11,
        size: tamanho,
        font: p.regular,
        color: TINTA.texto,
      });
    });
    p.y -= 11;
  }
}

function caixaDestaque(p: Pincel, rotulo: string, valor: string, subtitulo: string) {
  garantirEspaco(p, 64);
  p.y -= 58;
  p.pagina.drawRectangle({
    x: MARGEM.esquerda,
    y: p.y,
    width: LARGURA_UTIL,
    height: 52,
    color: rgb(0.94, 0.97, 0.96),
    borderColor: TINTA.destaque,
    borderWidth: 0.8,
  });
  p.pagina.drawText(sanear(rotulo), {
    x: MARGEM.esquerda + 14,
    y: p.y + 34,
    size: 8,
    font: p.negrito,
    color: TINTA.destaque,
  });
  p.pagina.drawText(sanear(valor), {
    x: MARGEM.esquerda + 14,
    y: p.y + 14,
    size: 17,
    font: p.negrito,
    color: TINTA.destaque,
  });
  const largura = p.regular.widthOfTextAtSize(sanear(subtitulo), 8);
  p.pagina.drawText(sanear(subtitulo), {
    x: A4.largura - MARGEM.direita - largura - 14,
    y: p.y + 19,
    size: 8,
    font: p.regular,
    color: TINTA.suave,
  });
}

/* -------------------------------------------------------------- conteúdo */

function cabecalhoDoDocumento(p: Pincel, apuracao: Apuracao) {
  const { identificacao } = apuracao.parametros;
  p.pagina.drawCircle({
    x: MARGEM.esquerda + 11,
    y: p.y - 6,
    size: 11,
    color: TINTA.marca,
  });
  p.pagina.drawText("R$", {
    x: MARGEM.esquerda + 4,
    y: p.y - 9.5,
    size: 8.5,
    font: p.negrito,
    color: rgb(1, 1, 1),
  });
  p.pagina.drawText("Salarium Debitum", {
    x: MARGEM.esquerda + 30,
    y: p.y - 4,
    size: 13,
    font: p.negrito,
    color: TINTA.marca,
  });
  p.pagina.drawText(sanear("Memorial de cálculo de mora salarial"), {
    x: MARGEM.esquerda + 30,
    y: p.y - 15,
    size: 8,
    font: p.regular,
    color: TINTA.suave,
  });
  const emitido = `Emitido em ${formatarData(apuracao.parametros.dataApuracao)}`;
  const largura = p.regular.widthOfTextAtSize(emitido, 8);
  p.pagina.drawText(emitido, {
    x: A4.largura - MARGEM.direita - largura,
    y: p.y - 4,
    size: 8,
    font: p.regular,
    color: TINTA.suave,
  });
  if (identificacao.responsavel) {
    const texto = sanear(`Responsável: ${identificacao.responsavel}`);
    const l2 = p.regular.widthOfTextAtSize(texto, 8);
    p.pagina.drawText(texto, {
      x: A4.largura - MARGEM.direita - l2,
      y: p.y - 15,
      size: 8,
      font: p.regular,
      color: TINTA.suave,
    });
  }
  p.y -= 28;
  p.pagina.drawLine({
    start: { x: MARGEM.esquerda, y: p.y },
    end: { x: A4.largura - MARGEM.direita, y: p.y },
    thickness: 1.4,
    color: TINTA.marca,
  });
  p.y -= 4;
}

function secaoIdentificacao(p: Pincel, apuracao: Apuracao) {
  const id = apuracao.parametros.identificacao;
  titulo(p, "1. Identificação");
  paresDeDados(p, [
    ["EMPREGADOR", id.empresa || "não informado"],
    ["CNPJ", id.cnpj || "não informado"],
    ["EMPREGADO", id.empregado || "não informado"],
    ["CARGO", id.cargo || "não informado"],
    ["BASE SALARIAL INFORMADA", id.baseSalarial === "bruto" ? "salário bruto" : "salário líquido"],
    ["DATA DE APURAÇÃO", formatarData(apuracao.parametros.dataApuracao)],
  ]);
  if (id.observacoes) {
    p.y -= 6;
    paragrafo(p, `Observações: ${id.observacoes}`, { tamanho: 8.6, cor: TINTA.suave });
  }
}

function secaoParametros(p: Pincel, apuracao: Apuracao) {
  const { juros, multa, correcao, calendario } = apuracao.parametros;
  titulo(p, "2. Critérios aplicados");

  paragrafo(
    p,
    "Prazo legal de pagamento: até o 5º dia útil do mês seguinte ao mês trabalhado, conforme o art. 459, §1º, da CLT. " +
      (calendario.sabadoEhUtil
        ? "Na contagem, o sábado foi considerado dia útil; domingos e feriados foram excluídos."
        : "Nesta apuração, a pedido de quem calculou, o sábado NÃO foi contado como dia útil.") +
      (calendario.bancarios
        ? " Carnaval e Corpus Christi foram excluídos da contagem por não haver expediente bancário."
        : " Carnaval e Corpus Christi foram contados como dias úteis."),
    { tamanho: 8.8, espacoDepois: 4 },
  );

  paragrafo(
    p,
    `Calendário de feriados: nacionais${
      calendario.regiao === "nenhuma" ? "" : `, mais os de ${rotuloDaRegiao(calendario.regiao)}`
    }.`,
    { tamanho: 8.8, espacoDepois: 4 },
  );

  if (calendario.locaisManuais?.length > 0) {
    paragrafo(
      p,
      `Feriados informados à mão por quem calculou: ${calendario.locaisManuais
        .map((f) => `${formatarData(f.data)}${f.nome ? ` (${f.nome})` : ""}`)
        .join("; ")}.`,
      { tamanho: 8.8, espacoDepois: 4 },
    );
  }

  paragrafo(
    p,
    juros.ativo
      ? `Juros de mora: ${formatarPercentual(juros.taxaMesPct)} ao mês, simples, calculados dia a dia sobre cada parcela em atraso, sem capitalização. Fundamento informado: ${juros.fundamento}.`
      : "Juros de mora: não aplicados nesta apuração.",
    { tamanho: 8.8, espacoDepois: 4 },
  );

  paragrafo(
    p,
    multa.ativa
      ? `Multa: ${
          multa.tipo === "percentual"
            ? `${formatarPercentual(multa.valor)} sobre ${multa.base === "salario" ? "o salário da competência" : "o valor pago em atraso somado ao saldo em aberto"}`
            : multa.tipo === "fixo"
              ? `valor fixo de ${formatarMoeda(multa.valor)} por competência em atraso`
              : `${multa.valor} salário-dia por dia de atraso`
        }${multa.tetoPercentual ? `, limitada a ${formatarPercentual(multa.tetoPercentual)} do salário` : ""}. Origem: ${multa.clausula || "cláusula não informada"}.`
      : "Multa: não aplicada. A CLT não prevê multa automática em favor do empregado pelo atraso do salário mensal; quando devida, ela decorre de convenção ou acordo coletivo da categoria.",
    { tamanho: 8.8, espacoDepois: 4 },
  );

  paragrafo(
    p,
    correcao.ativa
      ? correcao.modo === "manual"
        ? `Correção monetária: ${formatarPercentual(correcao.percentualManual)} acumulados, percentual informado por quem realizou o cálculo.`
        : `Correção monetária: variação mensal do ${correcao.indice} acumulada a partir do 1º dia do mês do vencimento, conforme a Súmula 381 do TST. Série obtida junto ao Banco Central do Brasil. Em período de deflação a correção é considerada zero: ela não reduz o valor devido.`
      : "Correção monetária: não aplicada nesta apuração.",
    { tamanho: 8.8 },
  );

  if (apuracao.mesesSemIndice.length > 0) {
    paragrafo(
      p,
      `Atenção: não havia índice publicado para ${apuracao.mesesSemIndice.join(", ")}. Esses meses ficaram de fora da correção, que por isso está subestimada.`,
      { tamanho: 8.6, cor: TINTA.alerta },
    );
  }
}

type ItemApurado = CompetenciaApurada | ObrigacaoApurada;

function ehCompetencia(item: ItemApurado): item is CompetenciaApurada {
  return "diasUteisContados" in item;
}

function valorDevidoDe(item: ItemApurado): number {
  return ehCompetencia(item) ? item.salarioCentavos : item.valorDevidoCentavos;
}

function secaoCompetencia(p: Pincel, c: ItemApurado, apuracao: Apuracao) {
  garantirEspaco(p, 120);
  p.y -= 16;
  const rotulo = sanear(
    ehCompetencia(c) ? `Competência de ${formatarCompetencia(c.ano, c.mes)}` : c.rotulo,
  );
  p.pagina.drawText(rotulo, {
    x: MARGEM.esquerda,
    y: p.y,
    size: 10,
    font: p.negrito,
    color: TINTA.texto,
  });
  const situacao = c.quitadaNoPrazo
    ? "PAGA NO PRAZO"
    : c.saldoAbertoCentavos > 0
      ? "EM ABERTO"
      : "PAGA COM ATRASO";
  const cor = c.quitadaNoPrazo ? TINTA.destaque : TINTA.alerta;
  const largura = p.negrito.widthOfTextAtSize(situacao, 8);
  p.pagina.drawText(situacao, {
    x: A4.largura - MARGEM.direita - largura,
    y: p.y,
    size: 8,
    font: p.negrito,
    color: cor,
  });
  p.y -= 4;

  const explicacao = ehCompetencia(c)
    ? `Vencimento legal em ${formatarData(c.vencimento)}, que é o 5º dia útil do mês seguinte ao trabalhado. ` +
      `Dias úteis contados: ${c.diasUteisContados.map((d) => formatarData(d).slice(0, 5)).join(", ")}. ` +
      `Valor devido da competência: ${formatarMoeda(c.salarioCentavos)}.`
    : `${c.fundamento} Valor devido: ${formatarMoeda(c.valorDevidoCentavos)}.`;
  paragrafo(p, explicacao, { tamanho: 8.6, cor: TINTA.suave, espacoDepois: 2 });
  if (!ehCompetencia(c) && c.observacao) {
    paragrafo(p, c.observacao, { tamanho: 8.6, cor: TINTA.suave, espacoDepois: 2 });
  }

  const colunas: Coluna[] = [
    { titulo: "Pagamento", largura: 80 },
    { titulo: "Situação", largura: 78 },
    { titulo: "Dias em atraso", largura: 72, alinhamento: "direita" },
    { titulo: "Valor aplicado", largura: 92, alinhamento: "direita" },
    { titulo: "Juros", largura: 84, alinhamento: "direita" },
    { titulo: "Correção", largura: 93, alinhamento: "direita" },
  ];

  const linhas: string[][] = c.pagamentos.map((pg) => [
    formatarData(pg.data),
    pg.situacao === "atrasado"
      ? "pago em atraso"
      : pg.situacao === "adiantado"
        ? "adiantamento"
        : pg.situacao === "em dia"
          ? "pago no prazo"
          : "sem valor",
    pg.diasAtraso > 0 ? String(pg.diasAtraso) : "-",
    formatarNumero(pg.valorAplicadoCentavos),
    pg.jurosCentavos > 0 ? formatarNumero(pg.jurosCentavos) : "-",
    pg.correcaoCentavos > 0 ? formatarNumero(pg.correcaoCentavos) : "-",
  ]);

  if (c.saldoAbertoCentavos > 0) {
    linhas.push([
      "em aberto",
      "não pago",
      String(c.diasAtrasoSaldo),
      formatarNumero(c.saldoAbertoCentavos),
      c.jurosSaldoCentavos > 0 ? formatarNumero(c.jurosSaldoCentavos) : "-",
      c.correcaoSaldoCentavos > 0 ? formatarNumero(c.correcaoSaldoCentavos) : "-",
    ]);
  }

  if (linhas.length === 0) {
    linhas.push(["-", "nenhum pagamento informado", "-", "-", "-", "-"]);
  }

  tabela(p, colunas, linhas);

  const resumo: [string, string][] = [
    ["Valor em atraso", formatarMoeda(c.valorEmAtrasoCentavos)],
    ["Juros de mora", formatarMoeda(c.jurosCentavos)],
  ];
  if (apuracao.parametros.multa.ativa) resumo.push(["Multa", formatarMoeda(c.multaCentavos)]);
  if (apuracao.parametros.correcao.ativa) {
    resumo.push(["Correção monetária", formatarMoeda(c.correcaoCentavos)]);
  }
  if (c.saldoAbertoCentavos > 0) {
    resumo.push(["Principal em aberto", formatarMoeda(c.saldoAbertoCentavos)]);
  }
  resumo.push(["Total desta parcela", formatarMoeda(c.totalDevidoCentavos)]);

  garantirEspaco(p, 16 + resumo.length * 12);
  p.y -= 10;
  for (const [chave, valor] of resumo) {
    const ehTotal = chave.startsWith("Total");
    const fonte = ehTotal ? p.negrito : p.regular;
    const cor2 = ehTotal ? TINTA.texto : TINTA.suave;
    p.pagina.drawText(sanear(chave), {
      x: MARGEM.esquerda + 6,
      y: p.y,
      size: 8.4,
      font: fonte,
      color: cor2,
    });
    const textoValor = sanear(valor);
    const w = fonte.widthOfTextAtSize(textoValor, 8.4);
    p.pagina.drawText(textoValor, {
      x: A4.largura - MARGEM.direita - w - 4,
      y: p.y,
      size: 8.4,
      font: fonte,
      color: cor2,
    });
    p.y -= 12;
  }
  if (c.excedenteCentavos > 0) {
    paragrafo(
      p,
      `Foi informado ${formatarMoeda(c.excedenteCentavos)} a mais do que o devido nesta parcela. O excedente não gera encargo e não foi somado ao total.`,
      { tamanho: 8, cor: TINTA.suave },
    );
  }
}

function secaoFalhas(p: Pincel, apuracao: Apuracao) {
  titulo(p, "3. Apuração do descumprimento do prazo");
  const todas: ItemApurado[] = [...apuracao.competencias, ...apuracao.obrigacoes];
  const atrasadas = todas.filter((c) => c.emAtraso);
  if (atrasadas.length === 0) {
    paragrafo(
      p,
      "Nenhuma competência informada ultrapassou o prazo do art. 459, §1º, da CLT. Não há juros nem multa a apurar.",
      { tamanho: 9 },
    );
    return;
  }
  paragrafo(
    p,
    `Das ${todas.length} parcelas analisadas, ${atrasadas.length} foram pagas depois do prazo legal. ` +
      `O maior atraso registrado foi de ${apuracao.maiorAtrasoDias} dias. ` +
      (apuracao.competenciasEmAberto > 0
        ? `${apuracao.competenciasEmAberto} parcela(s) permanecem com saldo não pago na data desta apuração.`
        : "Todas as parcelas foram quitadas, ainda que fora do prazo."),
    { tamanho: 9, espacoDepois: 4 },
  );

  const colunas: Coluna[] = [
    { titulo: "Parcela", largura: 110 },
    { titulo: "Vencia em", largura: 74 },
    { titulo: "Maior atraso", largura: 68, alinhamento: "direita" },
    { titulo: "Devido", largura: 82, alinhamento: "direita" },
    { titulo: "Em atraso", largura: 82, alinhamento: "direita" },
    { titulo: "Em aberto", largura: 83, alinhamento: "direita" },
  ];
  tabela(
    p,
    colunas,
    atrasadas.map((c) => [
      ehCompetencia(c) ? formatarCompetencia(c.ano, c.mes) : c.rotulo,
      formatarData(c.vencimento),
      `${c.maiorAtrasoDias} dias`,
      formatarNumero(valorDevidoDe(c)),
      formatarNumero(c.valorEmAtrasoCentavos),
      c.saldoAbertoCentavos > 0 ? formatarNumero(c.saldoAbertoCentavos) : "-",
    ]),
  );

  if (atrasadas.length >= 3) {
    p.y -= 8;
    paragrafo(
      p,
      "Registro de fato, sem juízo de valor: houve três ou mais parcelas pagas fora do prazo. O Decreto-Lei 368/1968 trata do atraso reiterado de salários e o art. 483, alínea d, da CLT trata do descumprimento de obrigações contratuais pelo empregador. O enquadramento de cada situação depende de análise profissional e não é feito por este documento.",
      { tamanho: 8.4, cor: TINTA.suave },
    );
  }
}

function secaoTotais(p: Pincel, apuracao: Apuracao) {
  titulo(p, "4. Resumo financeiro");
  const linhasResumo: ItemApurado[] = [...apuracao.competencias, ...apuracao.obrigacoes];
  const colunas: Coluna[] = [
    { titulo: "Parcela", largura: 104 },
    { titulo: "Devido", largura: 79, alinhamento: "direita" },
    { titulo: "Pago", largura: 79, alinhamento: "direita" },
    { titulo: "Em aberto", largura: 79, alinhamento: "direita" },
    { titulo: "Encargos", largura: 79, alinhamento: "direita" },
    { titulo: "Total", largura: 79, alinhamento: "direita" },
  ];
  tabela(
    p,
    colunas,
    linhasResumo.map((c) => [
      ehCompetencia(c) ? formatarCompetencia(c.ano, c.mes) : c.rotulo,
      formatarNumero(valorDevidoDe(c)),
      formatarNumero(c.totalPagoCentavos),
      formatarNumero(c.saldoAbertoCentavos),
      formatarNumero(c.encargosCentavos),
      formatarNumero(c.totalDevidoCentavos),
    ]),
  );

  p.y -= 10;
  const pares: [string, string][] = [
    ["Principal em aberto", formatarMoeda(apuracao.totalSaldoAbertoCentavos)],
    ["Juros de mora", formatarMoeda(apuracao.totalJurosCentavos)],
  ];
  if (apuracao.parametros.multa.ativa) {
    pares.push(["Multa", formatarMoeda(apuracao.totalMultaCentavos)]);
  }
  if (apuracao.parametros.correcao.ativa) {
    pares.push(["Correção monetária", formatarMoeda(apuracao.totalCorrecaoCentavos)]);
  }
  for (const [chave, valor] of pares) {
    garantirEspaco(p, 14);
    p.pagina.drawText(sanear(chave), {
      x: MARGEM.esquerda + 6,
      y: p.y,
      size: 9,
      font: p.regular,
      color: TINTA.suave,
    });
    const w = p.regular.widthOfTextAtSize(sanear(valor), 9);
    p.pagina.drawText(sanear(valor), {
      x: A4.largura - MARGEM.direita - w - 4,
      y: p.y,
      size: 9,
      font: p.regular,
      color: TINTA.texto,
    });
    p.y -= 13;
  }

  caixaDestaque(
    p,
    "TOTAL APURADO ATÉ A DATA DESTA APURAÇÃO",
    formatarMoeda(apuracao.totalGeralCentavos),
    "principal em aberto somado aos encargos",
  );
  p.y -= 6;
  paragrafo(
    p,
    "Os juros correm dia a dia. Se o pagamento não ocorrer na data desta apuração, o total precisa ser recalculado para a data efetiva.",
    { tamanho: 8, cor: TINTA.suave },
  );
}

function secaoFGTS(p: Pincel, apuracao: Apuracao) {
  if (apuracao.fgts.length === 0) return;
  titulo(p, "FGTS recolhido fora do prazo");
  paragrafo(
    p,
    "O depósito de 8% da remuneração é devido até o dia 20 do mês seguinte, na forma do art. 15 da Lei 8.036/1990, " +
      "mesmo quando o salário foi pago com atraso. O recolhimento em atraso sofre juros de mora de 0,5% ao mês ou fração " +
      "e multa de 5% no mês do vencimento ou de 10% a partir do mês seguinte, conforme o art. 22 da mesma lei. " +
      "A atualização pela TR, prevista no mesmo artigo, não está incluída nestes valores.",
    { tamanho: 8.4, cor: TINTA.suave, espacoDepois: 2 },
  );

  const colunas: Coluna[] = [
    { titulo: "Competência", largura: 78 },
    { titulo: "Vencia em", largura: 72 },
    { titulo: "Atraso", largura: 54, alinhamento: "direita" },
    { titulo: "Depósito", largura: 80, alinhamento: "direita" },
    { titulo: "Juros", largura: 70, alinhamento: "direita" },
    { titulo: "Multa", largura: 70, alinhamento: "direita" },
    { titulo: "Total", largura: 75, alinhamento: "direita" },
  ];
  tabela(
    p,
    colunas,
    apuracao.fgts.map((f) => [
      formatarCompetencia(Number(f.competencia.slice(0, 4)), Number(f.competencia.slice(5, 7))),
      formatarData(f.vencimento),
      f.diasAtraso > 0 ? `${f.diasAtraso} d` : "-",
      formatarNumero(f.depositoCentavos),
      f.jurosCentavos > 0 ? formatarNumero(f.jurosCentavos) : "-",
      f.multaCentavos > 0 ? `${formatarNumero(f.multaCentavos)} (${f.percentualMulta}%)` : "-",
      formatarNumero(f.totalCentavos),
    ]),
  );

  garantirEspaco(p, 40);
  p.y -= 12;
  const total = apuracao.totalFgtsDepositoCentavos + apuracao.totalFgtsEncargosCentavos;
  p.pagina.drawText(sanear("Total de FGTS a recolher, com encargos"), {
    x: MARGEM.esquerda + 6,
    y: p.y,
    size: 8.6,
    font: p.negrito,
    color: TINTA.texto,
  });
  const texto = sanear(formatarMoeda(total));
  const w = p.negrito.widthOfTextAtSize(texto, 8.6);
  p.pagina.drawText(texto, {
    x: A4.largura - MARGEM.direita - w - 4,
    y: p.y,
    size: 8.6,
    font: p.negrito,
    color: TINTA.texto,
  });
  p.y -= 12;
  paragrafo(
    p,
    "Este valor vai para a conta vinculada do trabalhador e não se soma ao total devido diretamente a ele.",
    { tamanho: 8, cor: TINTA.suave },
  );
}

function secaoFundamentos(p: Pincel, apuracao: Apuracao) {
  titulo(p, "5. Fundamentação");
  const itens: [string, string][] = [
    [
      "Prazo de pagamento",
      "Art. 459, §1º, da CLT: o pagamento do salário mensal deve ser efetuado até o 5º dia útil do mês subsequente ao vencido.",
    ],
    [
      "Constituição da mora",
      "Arts. 394 e 397 do Código Civil: em obrigação com data certa, a mora do devedor se constitui no dia seguinte ao vencimento, independentemente de qualquer aviso.",
    ],
    [
      "Juros de mora",
      "Art. 39 da Lei 8.177/1991, que trata dos juros sobre débitos trabalhistas não satisfeitos na época própria. A partir de 30 de agosto de 2024, com a Lei 14.905/2024, a taxa legal do art. 406 do Código Civil passou a ser a Selic deduzido o IPCA, critério padronizado pelo TST para a fase judicial.",
    ],
    [
      "Correção monetária",
      "Súmula 381 do TST: ultrapassado o 5º dia útil, incide o índice de correção do mês subsequente ao da prestação de serviços, a partir do dia 1º.",
    ],
    [
      "Multa pelo atraso",
      "Não há na CLT multa automática em favor do empregado pelo atraso do salário mensal. A multa do art. 477, §8º, aplica-se às verbas rescisórias. Quando devida, a multa moratória do salário mensal decorre de convenção ou acordo coletivo da categoria.",
    ],
    [
      "Imposto de renda",
      "Não incide imposto de renda sobre os juros de mora pagos por atraso no pagamento de remuneração: é a tese do Tema 808 do Supremo Tribunal Federal, seguida pelo Tema 878 do Superior Tribunal de Justiça e pelo art. 11, inciso XV, da Instrução Normativa RFB 1.500/2014. O principal pago em atraso mantém a natureza salarial e continua tributado; quando se refere a anos anteriores, aplica-se o regime dos rendimentos recebidos acumuladamente do art. 12-A da Lei 7.713/1988.",
    ],
  ];
  for (const [chave, texto] of itens) {
    garantirEspaco(p, 34);
    p.y -= 12;
    p.pagina.drawText(sanear(chave), {
      x: MARGEM.esquerda,
      y: p.y,
      size: 8.4,
      font: p.negrito,
      color: TINTA.texto,
    });
    paragrafo(p, texto, { tamanho: 8.4, cor: TINTA.suave, entrelinha: 11 });
  }
  if (apuracao.parametros.multa.ativa && apuracao.parametros.multa.clausula) {
    garantirEspaco(p, 34);
    p.y -= 12;
    p.pagina.drawText(sanear("Cláusula informada para a multa"), {
      x: MARGEM.esquerda,
      y: p.y,
      size: 8.4,
      font: p.negrito,
      color: TINTA.texto,
    });
    paragrafo(p, apuracao.parametros.multa.clausula, {
      tamanho: 8.4,
      cor: TINTA.suave,
      entrelinha: 11,
    });
  }
}

function secaoAvisos(p: Pincel) {
  titulo(p, "6. Limites deste documento");
  paragrafo(
    p,
    "Este memorial foi gerado por ferramenta automatizada a partir dos dados informados por quem o emitiu. Não é laudo pericial nem parecer jurídico, não substitui a análise de profissional habilitado e não considera a convenção coletiva da categoria, acordos individuais, descontos, adiantamentos não informados ou decisões judiciais em curso.",
    { tamanho: 8.4, cor: TINTA.suave, espacoDepois: 4 },
  );
  paragrafo(
    p,
    "Os valores dependem inteiramente dos dados de entrada. Confira as datas de pagamento, os valores e a base salarial antes de usar este documento em qualquer tratativa.",
    { tamanho: 8.4, cor: TINTA.suave },
  );
}

function rodapes(p: Pincel) {
  const total = p.paginas.length;
  p.paginas.forEach((pagina, indice) => {
    pagina.drawLine({
      start: { x: MARGEM.esquerda, y: MARGEM.base - 18 },
      end: { x: A4.largura - MARGEM.direita, y: MARGEM.base - 18 },
      thickness: 0.5,
      color: TINTA.linha,
    });
    pagina.drawText(sanear("Salarium Debitum — documento gerado automaticamente, sem valor pericial"), {
      x: MARGEM.esquerda,
      y: MARGEM.base - 30,
      size: 7.2,
      font: p.regular,
      color: TINTA.suave,
    });
    const texto = `Página ${indice + 1} de ${total}`;
    const w = p.regular.widthOfTextAtSize(texto, 7.2);
    pagina.drawText(texto, {
      x: A4.largura - MARGEM.direita - w,
      y: MARGEM.base - 30,
      size: 7.2,
      font: p.regular,
      color: TINTA.suave,
    });
  });
}

/* ----------------------------------------------------------------- saída */

export async function gerarMemorial(apuracao: Apuracao): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const negrito = await doc.embedFont(StandardFonts.HelveticaBold);
  const italico = await doc.embedFont(StandardFonts.HelveticaOblique);

  const primeira = doc.addPage([A4.largura, A4.altura]);
  const p: Pincel = {
    doc,
    pagina: primeira,
    paginas: [primeira],
    y: A4.altura - MARGEM.topo,
    regular,
    negrito,
    italico,
  };

  const id = apuracao.parametros.identificacao;
  doc.setTitle(sanear(`Memorial de cálculo — mora salarial${id.empregado ? ` — ${id.empregado}` : ""}`));
  doc.setSubject(sanear("Apuração de juros, multa e correção sobre valores pagos em atraso"));
  doc.setProducer("Salarium Debitum");
  doc.setCreator("Salarium Debitum");
  doc.setCreationDate(new Date());

  cabecalhoDoDocumento(p, apuracao);
  secaoIdentificacao(p, apuracao);
  secaoParametros(p, apuracao);
  secaoFalhas(p, apuracao);

  titulo(p, "Apuração parcela a parcela");
  for (const item of [...apuracao.competencias, ...apuracao.obrigacoes]) {
    secaoCompetencia(p, item, apuracao);
  }
  secaoFGTS(p, apuracao);

  secaoTotais(p, apuracao);
  secaoFundamentos(p, apuracao);
  secaoAvisos(p);
  rodapes(p);

  return doc.save();
}

export function nomeDoArquivo(apuracao: Apuracao): string {
  const empregado = apuracao.parametros.identificacao.empregado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const data = apuracao.parametros.dataApuracao;
  return `memorial-mora-salarial${empregado ? `-${empregado}` : ""}-${data}.pdf`;
}
