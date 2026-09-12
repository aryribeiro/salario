"use client";

import dynamic from "next/dynamic";

/**
 * A calculadora só faz sentido no navegador: lê o rascunho do armazenamento
 * local, usa a data de hoje e o relógio da pessoa. Renderizá-la também no
 * servidor gravava a data da compilação no HTML estático e, a cada visita em
 * outro dia, o React acusava divergência entre servidor e cliente (erro 418)
 * e refazia a página inteira. Aqui ela entra só no cliente, e o que o servidor
 * entrega é o cabeçalho e a apresentação, que continuam indexáveis.
 */
const Calculadora = dynamic(() => import("./calculadora").then((m) => m.Calculadora), {
  ssr: false,
  loading: () => <Apresentacao carregando />,
});

export function Apresentacao({ carregando = false }: { carregando?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6" aria-busy={carregando}>
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
      </header>

      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-suave">
        Para o líder ou gerente que precisa saber o tamanho do problema quando a empresa não
        conseguiu pagar tudo em dia, inclusive quando pagou uma parte na data e o restante dias
        depois. O cálculo acontece no seu navegador: nenhum dado sai deste computador. No fim, você
        baixa um memorial em PDF com datas, prazos, valores e a base legal de cada número.
      </p>

      {carregando && (
        <div
          className="rounded-2xl border border-borda bg-superficie p-6 text-sm text-suave"
          role="status"
        >
          Preparando a calculadora...
        </div>
      )}
    </div>
  );
}

export function CalculadoraCliente() {
  return <Calculadora />;
}
