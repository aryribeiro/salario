import { CalculadoraCliente } from "@/components/calculadora-cliente";

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Até quando a empresa pode pagar o salário do mês?",
    resposta:
      "Até o 5º dia útil do mês seguinte ao mês trabalhado, conforme o art. 459, §1º, da CLT. Na contagem desse prazo o sábado conta como dia útil; saem da conta os domingos e os feriados. Por isso o feriado da cidade importa: ele empurra a data-limite.",
  },
  {
    pergunta: "Existe multa automática por atrasar o salário?",
    resposta:
      "Não em favor do empregado. A CLT não cria multa automática pelo atraso do salário mensal do contrato em curso. A multa do art. 477 é das verbas rescisórias. O que existe é a multa administrativa aplicada pela fiscalização do trabalho, que é paga à União. A multa que o trabalhador recebe vem da convenção coletiva da categoria, quando ela prevê.",
  },
  {
    pergunta: "Trabalho em empresa de TI em São Paulo. Qual multa vale?",
    resposta:
      "A da convenção coletiva 2026/2027 entre o SINDPD-SP e o SEPROSP, registrada no Ministério do Trabalho sob o número SP002635/2026: salário pago fora do prazo recebe multa de 2% ao dia, limitada a 20%. Ela está pronta no menu de cláusulas, na aba Critérios, com o texto literal e a vigência. Mas atenção: a convenção é definida pela atividade principal da empresa, não pelo cargo. Se a empresa não é de tecnologia, vale a convenção da categoria dela.",
  },
  {
    pergunta: "E se a empresa pagou só uma parte na data certa?",
    resposta:
      "Cada parcela carrega os próprios dias de atraso. O que foi pago no prazo não gera encargo, o que foi pago depois gera juros proporcionais aos dias, e o que sobrou em aberto continua rendendo juros até a data da apuração. É exatamente o caso da empresa que paga metade no quinto dia útil e o resto duas semanas depois.",
  },
  {
    pergunta: "Férias pagas com atraso dobram?",
    resposta:
      "Não. A Súmula 450 do TST previa a dobra, mas o Supremo Tribunal Federal a declarou inconstitucional no julgamento da ADPF 501, em 2022. Sobre o atraso incidem juros e correção. A dobra do art. 137 da CLT continua valendo em outra hipótese: quando as férias são concedidas depois do período concessivo.",
  },
  {
    pergunta: "O FGTS também entra?",
    resposta:
      "Entra, e por um motivo simples: o depósito de 8% é devido sobre a remuneração do mês, mesmo que o salário tenha sido pago com atraso. Recolhido fora do prazo, o FGTS sofre juros de 0,5% ao mês ou fração e multa de 5% ou 10%, na forma do art. 22 da Lei 8.036/1990.",
  },
  {
    pergunta: "Os meus dados vão para algum servidor?",
    resposta:
      "Não. Nome, salário e datas ficam apenas no seu navegador, e o PDF é montado no seu computador. A única consulta externa é a do índice de inflação no Banco Central, que não leva nenhum dado seu.",
  },
];

export default function Pagina() {
  return (
    <main>
      <CalculadoraCliente />

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <h2 className="mb-4 text-lg font-semibold text-texto">Perguntas frequentes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PERGUNTAS.map((item) => (
            <details
              key={item.pergunta}
              className="rounded-2xl border border-borda bg-superficie p-4"
            >
              <summary className="cursor-pointer text-sm font-semibold text-texto">
                {item.pergunta}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-suave">{item.resposta}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
