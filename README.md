# 💰 Salarium Debitum

Calculadora de mora salarial: quanto uma empresa brasileira deve quando paga o trabalhador
fora do prazo. Cobre salário mensal, férias, décimo terceiro e FGTS, aceita pagamento
parcial e gera um memorial de cálculo em PDF com datas, prazos, valores e a base legal de
cada número.

Feito para o líder ou gerente que precisa medir o tamanho do problema, inclusive no caso
comum de pagar parte do salário na data e o restante dias depois.

## O que ele faz

- **Salário mensal.** Acha o 5º dia útil do mês seguinte ao trabalhado (art. 459, §1º, da
  CLT), contando o sábado como dia útil e excluindo domingos e feriados, inclusive os
  estaduais e municipais.
- **Pagamento parcial.** Cada parcela carrega os próprios dias de atraso. O que foi pago
  antes do vencimento é adiantamento e não gera encargo; o saldo não pago rende juros até
  a data da apuração.
- **Férias.** Vencimento dois dias antes do início do descanso (art. 145 da CLT), com terço
  constitucional e abono pecuniário.
- **Décimo terceiro.** Primeira parcela até 30 de novembro e segunda até 20 de dezembro,
  antecipando quando a data cai em dia sem expediente bancário.
- **FGTS.** Depósito de 8% com vencimento no dia 20 do mês seguinte, juros de 0,5% ao mês
  ou fração e multa de 5% ou 10%, na forma do art. 22 da Lei 8.036/1990.
- **Memorial em PDF.** Documento paginado com identificação, critérios, apuração parcela a
  parcela, resumo financeiro, fundamentação e os limites do próprio documento.

## O que ele deliberadamente não faz

- **Não inventa multa.** A CLT não cria multa automática em favor do empregado pelo atraso
  do salário mensal. A multa nasce desligada e só entra no cálculo quando o usuário informa
  a cláusula da convenção ou do acordo coletivo que a institui.
- **Não dobra férias pagas com atraso.** A Súmula 450 do TST previa a dobra, mas o Supremo
  Tribunal Federal a declarou inconstitucional no julgamento da ADPF 501, em 2022. A dobra
  do art. 137 da CLT continua disponível na hipótese correta: férias concedidas fora do
  período concessivo.
- **Não reduz a dívida por deflação.** Em período de índice negativo a correção é tratada
  como zero.
- **Não conclui direito.** Três ou mais parcelas em atraso aparecem como fato apurado, com
  a referência ao Decreto-Lei 368/1968 e ao art. 483 da CLT, sem enquadrar a situação.

## Privacidade

Nome, salário, datas e valores ficam apenas no navegador de quem calcula, e o PDF é montado
no próprio computador. A única chamada externa é a consulta do índice de inflação ao Banco
Central, que não leva nenhum dado do usuário.

## Base legal e tributária

CLT arts. 137, 145 e 459; Lei 4.090/1962 e Lei 4.749/1965; Lei 8.036/1990 arts. 15 e 22;
Lei 8.177/1991 art. 39; Código Civil arts. 394, 397 e 406, este com a redação da Lei
14.905/2024; Súmulas 81 e 381 do TST; ADPF 501 do STF. Sobre os juros de mora por atraso no
pagamento de remuneração não incide imposto de renda, conforme o Tema 808 do STF, o Tema 878
do STJ e o art. 11, XV, da Instrução Normativa RFB 1.500/2014.

O auxiliar de valor líquido usa a tabela do INSS da Portaria Interministerial MPS/MF 13/2026
e a tabela do imposto de renda de 2026 com o redutor da Lei 15.270/2025.

Feriados regionais: Lei estadual paulista 9.497/1997 (9 de julho) e Lei municipal 14.485/2007
(25 de janeiro, na capital).

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # motor de cálculo, tributos, parcelas e geração do PDF
npm run build
```

## Como está montado

```
src/lib/       motor de cálculo puro, sem React
  data.ts      datas em UTC, sem armadilha de fuso
  dinheiro.ts  dinheiro em centavos inteiros
  feriados.ts  calendário e 5º dia útil
  motor.ts     apuração de juros, multa e correção
  parcelas.ts  prazos de férias e décimo terceiro
  fgts.ts      encargos do FGTS em atraso
  tributos.ts  tabelas de INSS e imposto de renda de 2026
  pdf.ts       memorial de cálculo
src/components/ interface
src/app/api/indices  ponte com o Banco Central
```

O motor é puro e coberto por testes cujos valores foram conferidos à mão no calendário antes
de a primeira tela ser desenhada.

## Aviso

Ferramenta de apuração. Não é parecer jurídico, não é laudo pericial e não substitui a
análise de profissional habilitado nem a convenção coletiva da categoria.

---

Desenvolvido por [Ary Ribeiro](https://www.linkedin.com/in/aryribeiro)
