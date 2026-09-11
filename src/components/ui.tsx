"use client";

import { useId, type ReactNode } from "react";

import { formatarMoeda, lerValorEmCentavos } from "@/lib/dinheiro";

/* --------------------------------------------------------------- estrutura */

export function Cartao({
  titulo,
  descricao,
  acao,
  children,
  destaque = false,
}: {
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  destaque?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border bg-superficie p-5 shadow-[var(--sombra)] sm:p-6 ${
        destaque ? "border-marca/40" : "border-borda"
      }`}
    >
      {(titulo || acao) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-base font-semibold text-texto">{titulo}</h2>}
            {descricao && <p className="mt-1 text-sm text-suave">{descricao}</p>}
          </div>
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Grade({ children, colunas = 2 }: { children: ReactNode; colunas?: 2 | 3 | 4 }) {
  const classe =
    colunas === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : colunas === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2";
  return <div className={`grid grid-cols-1 gap-4 ${classe}`}>{children}</div>;
}

/* ------------------------------------------------------------------ campos */

interface BaseCampo {
  rotulo: string;
  ajuda?: string;
  erro?: string;
  className?: string;
}

function Envelope({
  rotulo,
  ajuda,
  erro,
  id,
  children,
  className,
}: BaseCampo & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-wide text-suave">
        {rotulo.toUpperCase()}
      </label>
      {children}
      {erro ? (
        <p className="mt-1 text-xs text-alerta">{erro}</p>
      ) : ajuda ? (
        <p className="mt-1 text-xs text-suave">{ajuda}</p>
      ) : null}
    </div>
  );
}

const ESTILO_ENTRADA =
  "w-full rounded-xl border border-borda bg-superficie-2 px-3 py-2.5 text-sm text-texto " +
  "placeholder:text-suave/70 transition-colors hover:border-borda-forte focus:border-marca " +
  "focus:outline-none focus:ring-2 focus:ring-marca/30";

export function CampoTexto({
  valor,
  aoMudar,
  tipo = "text",
  placeholder,
  ...base
}: BaseCampo & {
  valor: string;
  aoMudar: (valor: string) => void;
  tipo?: "text" | "date" | "month" | "number";
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Envelope {...base} id={id}>
      <input
        id={id}
        type={tipo}
        value={valor}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        className={ESTILO_ENTRADA}
        aria-invalid={base.erro ? true : undefined}
      />
    </Envelope>
  );
}

/**
 * Campo de dinheiro: aceita o que a pessoa digitar e normaliza ao sair do
 * campo. O estado guarda centavos inteiros; o texto é só a camada de digitação.
 */
export function CampoMoeda({
  centavos,
  aoMudar,
  placeholder = "0,00",
  ...base
}: BaseCampo & {
  centavos: number | null;
  aoMudar: (centavos: number | null) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Envelope {...base} id={id}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-suave">
          R$
        </span>
        <input
          id={id}
          inputMode="decimal"
          defaultValue={centavos === null ? "" : (centavos / 100).toFixed(2).replace(".", ",")}
          key={centavos === null ? "vazio" : String(centavos)}
          placeholder={placeholder}
          onBlur={(e) => aoMudar(lerValorEmCentavos(e.target.value))}
          onChange={(e) => {
            const lido = lerValorEmCentavos(e.target.value);
            if (lido !== null) aoMudar(lido);
            else if (e.target.value.trim() === "") aoMudar(null);
          }}
          className={`${ESTILO_ENTRADA} pl-9 text-right tabular-nums`}
          aria-invalid={base.erro ? true : undefined}
        />
      </div>
    </Envelope>
  );
}

export function CampoNumero({
  valor,
  aoMudar,
  sufixo,
  passo = 0.01,
  minimo = 0,
  ...base
}: BaseCampo & {
  valor: number;
  aoMudar: (valor: number) => void;
  sufixo?: string;
  passo?: number;
  minimo?: number;
}) {
  const id = useId();
  return (
    <Envelope {...base} id={id}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={passo}
          min={minimo}
          value={Number.isFinite(valor) ? valor : 0}
          onChange={(e) => aoMudar(Number(e.target.value))}
          className={`${ESTILO_ENTRADA} ${sufixo ? "pr-12" : ""} tabular-nums`}
        />
        {sufixo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-suave">
            {sufixo}
          </span>
        )}
      </div>
    </Envelope>
  );
}

export function Selecao<T extends string>({
  valor,
  opcoes,
  aoMudar,
  ...base
}: BaseCampo & {
  valor: T;
  opcoes: { valor: T; rotulo: string }[];
  aoMudar: (valor: T) => void;
}) {
  const id = useId();
  return (
    <Envelope {...base} id={id}>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value as T)}
        className={ESTILO_ENTRADA}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Envelope>
  );
}

export function Interruptor({
  ligado,
  aoMudar,
  titulo,
  descricao,
}: {
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  titulo: string;
  descricao?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-borda bg-superficie-2 p-3 transition-colors hover:border-borda-forte">
      <input
        type="checkbox"
        checked={ligado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--marca)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-texto">{titulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-suave">{descricao}</span>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ botões */

type Aparencia = "primario" | "secundario" | "sutil" | "perigo";

const ESTILOS_BOTAO: Record<Aparencia, string> = {
  primario:
    "bg-marca text-superficie hover:opacity-90 border-transparent font-semibold shadow-[var(--sombra)]",
  secundario: "bg-superficie text-texto border-borda-forte hover:border-marca hover:text-marca",
  sutil: "bg-transparent text-suave border-transparent hover:bg-superficie-2 hover:text-texto",
  perigo: "bg-transparent text-alerta border-transparent hover:bg-alerta-suave",
};

export function Botao({
  children,
  aoClicar,
  aparencia = "secundario",
  tipo = "button",
  desabilitado = false,
  tamanho = "normal",
  titulo,
}: {
  children: ReactNode;
  aoClicar?: () => void;
  aparencia?: Aparencia;
  tipo?: "button" | "submit";
  desabilitado?: boolean;
  tamanho?: "normal" | "pequeno";
  titulo?: string;
}) {
  return (
    <button
      type={tipo}
      onClick={aoClicar}
      disabled={desabilitado}
      title={titulo}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        tamanho === "pequeno" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
      } ${ESTILOS_BOTAO[aparencia]}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- avisos */

export function Aviso({
  tom = "atencao",
  titulo,
  children,
}: {
  tom?: "atencao" | "alerta" | "ok" | "neutro";
  titulo?: string;
  children: ReactNode;
}) {
  const estilos = {
    atencao: "border-atencao/40 bg-atencao-suave text-texto",
    alerta: "border-alerta/40 bg-alerta-suave text-texto",
    ok: "border-ok/40 bg-ok-suave text-texto",
    neutro: "border-borda bg-superficie-2 text-texto",
  }[tom];
  return (
    <div className={`rounded-xl border p-3.5 text-sm ${estilos}`}>
      {titulo && <p className="mb-1 font-semibold">{titulo}</p>}
      <div className="text-[13px] leading-relaxed text-suave">{children}</div>
    </div>
  );
}

export function NotaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-borda bg-superficie-2 p-3">
      <summary className="cursor-pointer list-none text-xs font-semibold text-marca marker:content-['']">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">§</span>
          {titulo}
          <span className="text-suave transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </span>
      </summary>
      <div className="mt-2 text-[13px] leading-relaxed text-suave">{children}</div>
    </details>
  );
}

export function Etiqueta({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "ok" | "alerta" | "atencao";
}) {
  const estilos = {
    neutro: "bg-superficie-2 text-suave border-borda",
    ok: "bg-ok-suave text-ok border-ok/30",
    alerta: "bg-alerta-suave text-alerta border-alerta/30",
    atencao: "bg-atencao-suave text-atencao border-atencao/30",
  }[tom];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${estilos}`}
    >
      {children}
    </span>
  );
}

export function ValorDestaque({
  rotulo,
  centavos,
  tom = "neutro",
  detalhe,
}: {
  rotulo: string;
  centavos: number;
  tom?: "neutro" | "marca" | "alerta";
  detalhe?: string;
}) {
  const cor = tom === "marca" ? "text-marca" : tom === "alerta" ? "text-alerta" : "text-texto";
  return (
    <div className="rounded-xl border border-borda bg-superficie-2 p-3.5">
      <p className="text-[11px] font-semibold tracking-wide text-suave">{rotulo.toUpperCase()}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${cor}`}>{formatarMoeda(centavos)}</p>
      {detalhe && <p className="mt-0.5 text-[11px] text-suave">{detalhe}</p>}
    </div>
  );
}
