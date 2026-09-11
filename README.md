# 💰 Salarium Debitum

Calculadora de mora salarial: quanto uma empresa brasileira deve quando paga o trabalhador
fora do prazo. Cobre salário mensal, férias, décimo terceiro e FGTS, aceita pagamento
parcial e gera um memorial de cálculo em PDF com datas, prazos, valores e a base legal de
cada número.

Feito para o líder ou gerente que precisa medir o tamanho do problema, inclusive no caso
comum de pagar parte do salário na data e o restante dias depois.

## O que ele faz

- **Identificação primeiro.** O cálculo começa dizendo de quem ele é: nome e cargo do
  trabalhador, razão social e CNPJ da empresa. Os quatro são obrigatórios, porque o memorial
  serve para apontar quem deve a quem. O CNPJ é conferido pelo dígito verificador, nos
  formatos numérico e alfanumérico, e o campo aceita CPF quando o empregador é pessoa física.
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
- **Dois regimes de juros.** Taxa fixa ao mês, com 1% como padrão, ou a taxa legal do art. 406
  do Código Civil na redação da Lei 14.905/2024, que é a Selic do mês menos o IPCA do mês, com
  piso em zero. No segundo caso cada mês entra com a sua própria taxa, buscada no Banco
  Central, proporcional aos dias em que a dívida existiu naquele mês.
- **Memorial em PDF.** Documento paginado com identificação, critérios, apuração parcela a
  parcela, resumo financeiro, fundamentação e os limites do próprio documento. Quando os juros
  vêm da taxa legal, o memorial imprime a taxa aplicada em cada mês.

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

O rascunho fica guardado no navegador entre uma visita e outra. Com o aplicativo aberto em
mais de uma aba, a gravação de uma aba não apaga o trabalho da outra em silêncio: a aba que
tem edição própria avisa e deixa a escolha com o usuário, e a aba que ainda não foi editada
adota a versão mais recente sem incomodar.

## Fontes

Toda regra do motor de cálculo nasce de uma destas fontes. Os endereços foram verificados em
11 de setembro de 2026.

### Prazos e encargos

| Regra no aplicativo | Fonte |
|---|---|
| Salário até o 5º dia útil do mês seguinte (art. 459, §1º); férias dois dias antes do gozo (art. 145); dobra das férias fora do período concessivo (art. 137); mora contumaz e rescisão indireta (art. 483, "d") | [CLT, Decreto-Lei 5.452/1943](https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm) |
| Décimo terceiro até 20 de dezembro | [Lei 4.090/1962](https://www.planalto.gov.br/ccivil_03/leis/l4090.htm) |
| Primeira parcela do décimo terceiro entre fevereiro e 30 de novembro | [Lei 4.749/1965](https://www.planalto.gov.br/ccivil_03/leis/l4749.htm) |
| Juros de mora sobre débitos trabalhistas não pagos na época própria | [Lei 8.177/1991, art. 39](https://www.planalto.gov.br/ccivil_03/leis/l8177.htm) |
| Constituição da mora em obrigação com data certa e taxa legal de juros | [Código Civil, arts. 394, 397 e 406](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) |
| Taxa legal passa a ser a Selic deduzido o IPCA, desde 30/08/2024 | [Lei 14.905/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14905.htm) |
| Atraso reiterado de salários | [Decreto-Lei 368/1968](https://www.planalto.gov.br/ccivil_03/decreto-lei/del0368.htm) |
| Depósito de 8% do FGTS e encargos do recolhimento em atraso (arts. 15 e 22) | [Lei 8.036/1990](https://www.planalto.gov.br/ccivil_03/leis/l8036consol.htm) |
| Prazo do dia 20 e cálculo dos encargos na prática | [FGTS Digital, Ministério do Trabalho e Emprego](https://www.gov.br/trabalho-e-emprego/pt-br/servicos/empregador/fgtsdigital) |

### Jurisprudência

| Regra no aplicativo | Fonte |
|---|---|
| Correção monetária do salário pago depois do 5º dia útil, a partir do dia 1º do mês subsequente (Súmula 381); dobra dos dias gozados fora do período de concessão (Súmula 81) | [Súmulas do TST](https://www.tst.jus.br/sumulas) |
| Férias pagas com atraso **não** dobram: a Súmula 450 do TST foi declarada inconstitucional | Supremo Tribunal Federal, ADPF 501, julgada em 16 de setembro de 2022 |
| Índices de atualização dos créditos trabalhistas | Supremo Tribunal Federal, ADC 58 e ADC 59, julgadas em dezembro de 2020 |
| Não incide imposto de renda sobre juros de mora por atraso no pagamento de remuneração | Supremo Tribunal Federal, Tema 808 (RE 855.091), e [Superior Tribunal de Justiça, Tema 878](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/17112021-Nao-ha-incidencia-de-IR-sobre-juros-de-mora-no-pagamento-de-verba-alimentar-a-pessoa-fisica--.aspx) |

As decisões do Supremo aparecem pelo número do processo porque o portal do tribunal recusa
acesso automatizado, o que impede verificar o endereço de cada notícia.

### Tributos e valores de 2026

| Regra no aplicativo | Fonte |
|---|---|
| Tabela mensal do imposto de renda, dedução por dependente e desconto simplificado | [Receita Federal, tributação de 2026](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026) |
| Redutor que zera o imposto até R$ 5.000,00 e decresce até R$ 7.350,00 | [Lei 15.270/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) e [exemplos oficiais de aplicação](https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/exemplos-de-aplicacao-da-lei-15-270-2025) |
| Faixas do INSS e teto do salário de contribuição | [Portaria Interministerial MPS/MF 13/2026](https://www.gov.br/previdencia/pt-br/assuntos/rpps/destaques/publicada-a-portaria-interministerial-mps-mf-no-13-de-9-01-2026-que-dispoe-sobre-o-reajuste-dos-beneficios-pagos-pelo-inss-e-demais-valores) |
| Salário mínimo de R$ 1.621,00 | [Decreto 12.797/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm) |
| Rendimentos recebidos acumuladamente | [Lei 7.713/1988, art. 12-A](https://www.planalto.gov.br/ccivil_03/leis/l7713.htm) |
| CNPJ alfanumérico, emitido desde 31 de julho de 2026, e o dígito verificador por módulo 11 sobre o valor ASCII menos 48 | [Receita Federal, CNPJ Alfanumérico](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico) e [cálculo dos dígitos, Serpro](https://www.serpro.gov.br/menu/noticias/videos/calculodvcnpjalfanaumerico.pdf) |

Os dois exemplos publicados pela Receita Federal para a Lei 15.270/2025 são reproduzidos
centavo a centavo pelos testes automatizados deste repositório.

### Calendário

| Regra no aplicativo | Fonte |
|---|---|
| Feriados nacionais | [Lei 662/1949, com a redação da Lei 10.607/2002](https://www.planalto.gov.br/ccivil_03/leis/2002/l10607.htm) e [Lei 9.093/1995](https://www.planalto.gov.br/ccivil_03/leis/l9093.htm) |
| 20 de novembro como feriado nacional, a partir de 2024 | [Lei 14.759/2023](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm) |
| 9 de julho, feriado no estado de São Paulo | [Lei estadual 9.497/1997](https://www.al.sp.gov.br/repositorio/legislacao/lei/1997/lei-9497-05.03.1997.html) |
| 25 de janeiro, feriado na capital paulista | [Lei municipal 14.485/2007](https://legislacao.prefeitura.sp.gov.br/lei-20000-de-19-de-julho-de-2007) |

### Dados

| Uso | Fonte |
|---|---|
| Variação mensal do IPCA (série 433), do INPC (série 188) e do IGP-M (série 189) | [Sistema Gerenciador de Séries Temporais do Banco Central](https://www3.bcb.gov.br/sgspub/), consultado pela [API pública](https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json) |
| Selic acumulada no mês (série 4390), usada com o IPCA para compor a taxa legal | mesma fonte |

A consulta passa por uma rota do próprio aplicativo, que guarda o resultado por seis horas,
repete a chamada até três vezes com recuo exponencial e jitter, e serve a última resposta
conhecida quando o Banco Central não responde. Período sem índice publicado não é tratado como
falha: os meses faltantes são listados e o valor correspondente fica de fora, em vez de virar
zero silencioso.

### O que não virou regra

A multa administrativa por atraso de salário, hoje em R$ 176,03 por trabalhador prejudicado
pela Portaria MTE 1.131/2025, é citada na interface mas não entra em nenhuma conta: ela é
devida à União, não ao empregado. A atualização pela TR sobre o FGTS em atraso também fica de
fora, e o memorial declara isso.

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
