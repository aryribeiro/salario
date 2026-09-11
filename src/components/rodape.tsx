export function Rodape() {
  return (
    <footer className="sem-impressao mt-12 border-t border-borda px-4 py-8 text-center">
      <p className="text-sm text-suave">
        <strong className="font-semibold text-texto">Salarium Debitum</strong> — Desenvolvido por{" "}
        <a
          href="https://www.linkedin.com/in/aryribeiro"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-texto no-underline hover:text-marca"
        >
          Ary Ribeiro
        </a>
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-xs text-suave">
        Ferramenta de apuração. Não é parecer jurídico e não substitui a análise de profissional
        habilitado nem a convenção coletiva da categoria.
      </p>
    </footer>
  );
}
