"use client";

import { formatarData } from "@/lib/data";
import { formatarMoeda } from "@/lib/dinheiro";
import type { Apuracao, CompetenciaApurada, ObrigacaoApurada } from "@/lib/tipos";

import { Aviso, Botao, Cartao, Etiqueta, ValorDestaque } from "./ui";

function Situacao({ item }: { item: CompetenciaApurada | ObrigacaoApurada }) {
  if (item.quitadaNoPrazo) return <Etiqueta tom="ok">paga no prazo</Etiqueta>;
  if (item.aVencer) return <Etiqueta tom="neutro">a vencer</Etiqueta>;
  if (item.saldoAbertoCentavos > 0) return <Etiqueta tom="alerta">em aberto</Etiqueta>;
  return <Etiqueta tom="atencao">paga com atraso</Etiqueta>;
}

function Barra({ item }: { item: CompetenciaApurada | ObrigacaoApurada }) {
  const pago = item.totalPagoCentavos;
  const devido = "salarioCentavos" in item ? item.salarioCentavos : item.valorDevidoCentavos;
  const proporcao = devido > 0 ? Math.min(100, Math.round((pago / devido) * 100)) : 0;
  const cor = item.quitadaNoPrazo
    ? "bg-ok"
    : item.saldoAbertoCentavos > 0
      ? "bg-alerta"
      : "bg-atencao";
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-superficie-2"
      role="img"
      aria-label={`${proporcao}% do valor foi pago`}
    >
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${proporcao}%` }} />
    </div>
  );
}

function LinhaDetalhe({
  item,
  mostrarMulta,
  mostrarCorrecao,
}: {
  item: CompetenciaApurada | ObrigacaoApurada;
  mostrarMulta: boolean;
  mostrarCorrecao: boolean;
}) {
  const devido = "salarioCentavos" in item ? item.salarioCentavos : item.valorDevidoCentavos;
  const titulo = item.rotulo;
  const fundamento =
    "diasUteisContados" in item
      ? `5º dia útil do mês seguinte (art. 459, §1º, da CLT)`
      : item.fundamento;

  return (
    <details className="group rounded-xl border border-borda bg-superficie-2 p-3.5">
      <summary className="cursor-pointer list-none marker:content-['']">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-texto">
              <span className="first-letter:uppercase">{titulo}</span>
            </p>
            <p className="mt-0.5 text-xs text-suave">
              {item.aVencer ? "vence em" : "vencia em"} {formatarData(item.vencimento)}
              {item.maiorAtrasoDias > 0 && ` · atraso de até ${item.maiorAtrasoDias} dias`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Situacao item={item} />
            <span className="text-sm font-semibold tabular-nums text-texto">
              {formatarMoeda(item.totalDevidoCentavos)}
            </span>
          </div>
        </div>
        <div className="mt-2.5">
          <Barra item={item} />
        </div>
      </summary>

      <div className="mt-4 space-y-3 border-t border-borda pt-3">
        <p className="text-xs text-suave">{fundamento}</p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="text-suave">
                <th className="pb-1.5 font-semibold">Pagamento</th>
                <th className="pb-1.5 font-semibold">Situação</th>
                <th className="pb-1.5 text-right font-semibold">Atraso</th>
                <th className="pb-1.5 text-right font-semibold">Valor</th>
                <th className="pb-1.5 text-right font-semibold">Juros</th>
                {mostrarCorrecao && <th className="pb-1.5 text-right font-semibold">Correção</th>}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {item.pagamentos.map((p) => (
                <tr key={p.id} className="border-t border-borda">
                  <td className="py-1.5">{formatarData(p.data)}</td>
                  <td className="py-1.5 text-suave">
                    {p.situacao === "atrasado"
                      ? "em atraso"
                      : p.situacao === "adiantado"
                        ? "adiantamento"
                        : p.situacao === "em dia"
                          ? "no prazo"
                          : p.situacao === "excedente"
                            ? "além do devido"
                            : p.situacao === "futuro"
                              ? "após a apuração"
                              : "sem valor"}
                  </td>
                  <td className="py-1.5 text-right">{p.diasAtraso > 0 ? `${p.diasAtraso} d` : "—"}</td>
                  <td className="py-1.5 text-right">{formatarMoeda(p.valorAplicadoCentavos)}</td>
                  <td className="py-1.5 text-right">
                    {p.jurosCentavos > 0 ? formatarMoeda(p.jurosCentavos) : "—"}
                  </td>
                  {mostrarCorrecao && (
                    <td className="py-1.5 text-right">
                      {p.correcaoCentavos > 0 ? formatarMoeda(p.correcaoCentavos) : "—"}
                    </td>
                  )}
                </tr>
              ))}
              {item.saldoAbertoCentavos > 0 && (
                <tr className="border-t border-borda text-alerta">
                  <td className="py-1.5">não pago</td>
                  <td className="py-1.5">em aberto</td>
                  <td className="py-1.5 text-right">{item.diasAtrasoSaldo} d</td>
                  <td className="py-1.5 text-right">{formatarMoeda(item.saldoAbertoCentavos)}</td>
                  <td className="py-1.5 text-right">
                    {item.jurosSaldoCentavos > 0 ? formatarMoeda(item.jurosSaldoCentavos) : "—"}
                  </td>
                  {mostrarCorrecao && (
                    <td className="py-1.5 text-right">
                      {item.correcaoSaldoCentavos > 0
                        ? formatarMoeda(item.correcaoSaldoCentavos)
                        : "—"}
                    </td>
                  )}
                </tr>
              )}
              {item.pagamentos.length === 0 && item.saldoAbertoCentavos === 0 && (
                <tr className="border-t border-borda">
                  <td colSpan={6} className="py-2 text-suave">
                    nenhum pagamento informado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-suave">Valor devido</dt>
            <dd className="font-medium tabular-nums">{formatarMoeda(devido)}</dd>
          </div>
          <div>
            <dt className="text-suave">Juros</dt>
            <dd className="font-medium tabular-nums">{formatarMoeda(item.jurosCentavos)}</dd>
          </div>
          {mostrarMulta && (
            <div>
              <dt className="text-suave">Multa</dt>
              <dd className="font-medium tabular-nums">{formatarMoeda(item.multaCentavos)}</dd>
            </div>
          )}
          {mostrarCorrecao && (
            <div>
              <dt className="text-suave">Correção</dt>
              <dd className="font-medium tabular-nums">{formatarMoeda(item.correcaoCentavos)}</dd>
            </div>
          )}
        </dl>

        {item.excedenteCentavos > 0 && (
          <p className="text-xs text-suave">
            Foi informado {formatarMoeda(item.excedenteCentavos)} a mais do que o devido. O excedente
            não gera encargo e não entra no total.
          </p>
        )}
        {"observacao" in item && item.observacao && (
          <p className="text-xs text-suave">{item.observacao}</p>
        )}
      </div>
    </details>
  );
}

export function Resumo({
  apuracao,
  aoBaixar,
  gerando,
  podeBaixar,
  faltaIdentificacao,
  aoCorrigirIdentificacao,
}: {
  apuracao: Apuracao;
  aoBaixar: () => void;
  gerando: boolean;
  podeBaixar: boolean;
  faltaIdentificacao: boolean;
  aoCorrigirIdentificacao: () => void;
}) {
  const { parametros } = apuracao;
  const nada = apuracao.competencias.length === 0 && apuracao.obrigacoes.length === 0;
  const semAtraso = !nada && apuracao.totalGeralCentavos === 0 && apuracao.maiorAtrasoDias === 0;

  return (
    <Cartao destaque>
      <p className="text-[11px] font-semibold tracking-wide text-suave">
        TOTAL APURADO EM {formatarData(parametros.dataApuracao)}
      </p>
      <p
        className={`mt-1 text-3xl font-bold tabular-nums ${
          apuracao.totalGeralCentavos > 0 ? "text-marca" : "text-texto"
        }`}
      >
        {formatarMoeda(apuracao.totalGeralCentavos)}
      </p>
      <p className="mt-1 text-xs text-suave">
        principal em aberto somado a juros{parametros.multa.ativa ? ", multa" : ""}
        {parametros.correcao.ativa ? " e correção" : ""}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <ValorDestaque rotulo="Em aberto" centavos={apuracao.totalSaldoAbertoCentavos} />
        <ValorDestaque rotulo="Juros" centavos={apuracao.totalJurosCentavos} />
        {parametros.multa.ativa && (
          <ValorDestaque rotulo="Multa" centavos={apuracao.totalMultaCentavos} />
        )}
        {parametros.correcao.ativa && (
          <ValorDestaque rotulo="Correção" centavos={apuracao.totalCorrecaoCentavos} />
        )}
        {apuracao.totalAVencerCentavos > 0 && (
          <ValorDestaque
            rotulo="A vencer"
            centavos={apuracao.totalAVencerCentavos}
            detalhe="ainda no prazo; fora do total"
          />
        )}
      </div>

      {apuracao.fgts.length > 0 && (
        <div className="mt-3 rounded-xl border border-borda bg-superficie-2 p-3">
          <p className="text-[11px] font-semibold tracking-wide text-suave">
            FGTS — DEPÓSITO E ENCARGOS
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-texto">
            {formatarMoeda(
              apuracao.totalFgtsDepositoCentavos + apuracao.totalFgtsEncargosCentavos,
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-suave">
            vai para a conta vinculada do trabalhador, não é pago direto a ele
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Botao aparencia="primario" aoClicar={aoBaixar} desabilitado={!podeBaixar || gerando}>
          {gerando ? "Gerando memorial..." : "Baixar memorial em PDF"}
        </Botao>
        {!podeBaixar &&
          (nada ? (
            <p className="text-xs text-suave">
              Informe pelo menos um valor devido para liberar o memorial.
            </p>
          ) : faltaIdentificacao ? (
            <div className="rounded-xl border border-atencao/40 bg-atencao-suave p-3">
              <p className="text-[13px] text-texto">
                Falta dizer de quem é este cálculo. O memorial só sai com o nome e o cargo do
                trabalhador e com a empresa e o CNPJ de quem deve.
              </p>
              <div className="mt-2">
                <Botao tamanho="pequeno" aoClicar={aoCorrigirIdentificacao}>
                  Preencher agora
                </Botao>
              </div>
            </div>
          ) : null)}
      </div>

      {nada && (
        <div className="mt-4">
          <Aviso tom="neutro" titulo="Nada apurado ainda">
            Preencha uma competência de salário, um período de férias ou uma parcela do décimo
            terceiro para ver o resultado.
          </Aviso>
        </div>
      )}

      {semAtraso && (
        <div className="mt-4">
          <Aviso tom="ok" titulo="Nenhum atraso encontrado">
            Todos os valores informados foram pagos dentro do prazo legal. Não há juros nem multa a
            apurar. O memorial em PDF também registra isso.
          </Aviso>
        </div>
      )}
    </Cartao>
  );
}

export function Detalhamento({ apuracao }: { apuracao: Apuracao }) {
  const { parametros } = apuracao;
  const mostrarMulta = parametros.multa.ativa;
  const mostrarCorrecao = parametros.correcao.ativa;
  const itens = [...apuracao.competencias, ...apuracao.obrigacoes];
  if (itens.length === 0 && apuracao.fgts.length === 0) return null;

  // O Decreto-Lei 368/1968 fala em atraso de salários; férias e 13º não contam aqui.
  const salariosAtrasados = apuracao.competencias.filter((c) => c.emAtraso);

  return (
    <div className="space-y-4">
      <Cartao
        titulo="Apuração item a item"
        descricao="Cada linha abre e mostra os pagamentos, os dias de atraso e como o valor foi formado."
      >
        <div className="space-y-2">
          {itens.map((item) => (
            <LinhaDetalhe
              key={item.id}
              item={item}
              mostrarMulta={mostrarMulta}
              mostrarCorrecao={mostrarCorrecao}
            />
          ))}
        </div>

        {salariosAtrasados.length >= 3 && (
          <div className="mt-4">
            <Aviso tom="atencao" titulo="Três ou mais salários fora do prazo">
              Este é um registro de fato, não uma conclusão jurídica. O Decreto-Lei 368/1968 trata do
              atraso reiterado de salários por três meses ou mais, e o art. 483, alínea d, da CLT
              trata do descumprimento de obrigações do contrato pelo empregador. O enquadramento
              depende de análise profissional.
            </Aviso>
          </div>
        )}
      </Cartao>

      {apuracao.fgts.length > 0 && (
        <Cartao
          titulo="FGTS recolhido fora do prazo"
          descricao="Depósito de 8% com juros de 0,5% ao mês ou fração e multa de 5% ou 10%, na forma do art. 22 da Lei 8.036/1990."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="text-suave">
                  <th className="pb-1.5 font-semibold">Competência</th>
                  <th className="pb-1.5 font-semibold">Vencia em</th>
                  <th className="pb-1.5 text-right font-semibold">Atraso</th>
                  <th className="pb-1.5 text-right font-semibold">Depósito</th>
                  <th className="pb-1.5 text-right font-semibold">Juros</th>
                  <th className="pb-1.5 text-right font-semibold">Multa</th>
                  <th className="pb-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {apuracao.fgts.map((f) => (
                  <tr key={f.competencia} className="border-t border-borda">
                    <td className="py-1.5">{f.competencia}</td>
                    <td className="py-1.5">{formatarData(f.vencimento)}</td>
                    <td className="py-1.5 text-right">
                      {f.diasAtraso > 0 ? `${f.diasAtraso} d` : "—"}
                    </td>
                    <td className="py-1.5 text-right">{formatarMoeda(f.depositoCentavos)}</td>
                    <td className="py-1.5 text-right">
                      {f.jurosCentavos > 0 ? formatarMoeda(f.jurosCentavos) : "—"}
                    </td>
                    <td className="py-1.5 text-right">
                      {f.multaCentavos > 0
                        ? `${formatarMoeda(f.multaCentavos)} (${f.percentualMulta}%)`
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right font-semibold">
                      {formatarMoeda(f.totalCentavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-suave">
            A atualização pela TR prevista no mesmo artigo não está incluída nestes valores.
          </p>
        </Cartao>
      )}
    </div>
  );
}
