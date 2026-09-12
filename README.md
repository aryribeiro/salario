# 💰 Salarium Debitum

Calculadora de mora salarial: quanto uma empresa brasileira deve quando paga o trabalhador
fora do prazo. Cobre salário mensal, férias, décimo terceiro e FGTS, aceita pagamento
parcial e gera um memorial de cálculo em PDF com datas, prazos, valores e a base legal de
cada número.

Feito para o líder ou gerente que precisa medir o tamanho do problema, inclusive no caso
comum de pagar parte do salário na data e o restante dias depois.

## Como usar, passo a passo

Feito para quem nunca abriu o aplicativo. Não é preciso instalar nada nem criar conta:
tudo acontece na página, em [salario2026.vercel.app](https://salario2026.vercel.app).

### O caminho mais curto

1. **Abra o aplicativo.** Ele começa na aba **Quem**.
2. **Diga de quem é o cálculo.** Preencha o nome do trabalhador, o cargo, o nome da empresa e
   o CNPJ. Os quatro são obrigatórios, porque saem impressos no documento final.
3. **Vá para a aba Salário.** Escolha o mês em que a pessoa trabalhou e digite quanto ela
   tinha a receber naquele mês.
4. **Informe o que a empresa pagou.** Clique em **+ Adicionar pagamento** e preencha a data e
   o valor. Repita para cada pagamento, inclusive os parciais.
5. **Baixe o documento.** No quadro do resultado, clique em **Baixar memorial em PDF**.

O total fica no quadro do resultado, ao lado no computador e logo abaixo no celular. Ele
muda enquanto você digita: não existe botão de calcular.

### Um exemplo do começo ao fim

Agosto de 2026. A pessoa tinha R$ 3.000,00 a receber. A empresa pagou R$ 1.800,00 no dia 5 de
setembro e só quitou os R$ 1.200,00 restantes no dia 22.

| O que fazer | O que digitar |
|---|---|
| Aba Quem | nome, cargo, empresa e CNPJ |
| Aba Salário, campo "Mês trabalhado" | agosto de 2026 |
| Campo "Valor devido no mês" | 3000,00 |
| Primeiro pagamento | 05/09/2026 e 1800,00 |
| Segundo pagamento | 22/09/2026 e 1200,00 |

O aplicativo descobre sozinho que o prazo terminava em **5 de setembro de 2026**, que é o
quinto dia útil do mês seguinte ao trabalhado. Então conclui que a primeira parte foi paga no
prazo e a segunda atrasou **17 dias**, o que dá **R$ 6,80** de juros. Com a data de apuração em
30 de setembro, o total devido fica em **R$ 6,80**, já que não sobrou saldo em aberto.

Se a empresa não tivesse pago a segunda parte, o valor continuaria contando juros dia após dia
até a data da apuração.

### O que faz cada aba

**Quem.** A identificação. Nome e cargo do trabalhador, nome e CNPJ da empresa. O CNPJ é
conferido na hora: se o número não fechar, o campo avisa. Aqui também se escolhe se os valores
que você vai digitar são líquidos, o que cai na conta, ou brutos, antes dos descontos. Os
campos de quem preparou o cálculo e as observações são opcionais.

**Salário.** Uma competência para cada mês trabalhado. Use **+ Adicionar competência** para
somar meses. Dentro de cada uma, **+ Adicionar pagamento** registra o que a empresa pagou e
quando. Pagamento feito antes do prazo é adiantamento e não gera encargo. Se a empresa não
pagou nada, basta não adicionar pagamento algum. Há ainda uma calculadora auxiliar que estima
o valor líquido a partir do bruto, com as tabelas de 2026.

**Férias.** Use quando a pessoa saiu de férias sem receber, ou recebeu depois da hora. Clique
em **+ Adicionar período**, informe o primeiro dia de descanso e o aplicativo calcula o prazo,
que termina dois dias antes. O valor pode ser calculado a partir do salário, já com o terço
constitucional, ou digitado por inteiro. Se o descanso foi concedido fora do prazo legal,
ligue a chave **Férias gozadas fora do período concessivo**.

**13º salário.** Clique em **+ Adicionar ano** e informe o valor de cada parcela. O aplicativo
já sabe que a primeira vence em 30 de novembro e a segunda em 20 de dezembro, e antecipa a data
quando ela cai em dia sem banco. Cada parcela tem a sua própria lista de pagamentos.

**FGTS.** Ligue a chave **Calcular também o FGTS** para apurar o depósito de 8% e os encargos
do recolhimento atrasado. O botão **Copiar da aba Salário** traz os meses que você já digitou,
para não redigitar. Deixe a data do recolhimento em branco se o depósito ainda não foi feito.

**Critérios.** Só mexa aqui se precisar. Vem tudo pronto com o que a lei impõe: juros de 1% ao
mês e nenhuma multa. Nesta aba você pode mudar a data até onde os juros correm, escolher a taxa
legal que varia mês a mês, ligar a multa da convenção coletiva da sua categoria, ligar a
correção monetária e ajustar a região dos feriados, que vem em São Paulo capital.

Na multa, o menu **Cláusula** traz os formatos que mais aparecem nas convenções, como um
trinta avos do salário por dia de atraso ou um percentual sobre o valor pago fora do prazo.
Escolha um formato, escreva de qual convenção ele vem e clique em **Salvar** com um nome: nas
próximas apurações a cláusula volta pronta no mesmo menu. A multa alcança só o salário, a não
ser que você ligue a chave que a estende a férias e 13º.

### Dicas que economizam tempo

- **Não sabe por onde começar?** Clique em **Ver exemplo**, no alto da página, e veja a
  ferramenta preenchida. Depois clique em **Limpar** para recomeçar do zero.
- **O botão do PDF está apagado?** Falta preencher a identificação na aba Quem ou informar
  algum valor devido. O quadro do resultado diz qual dos dois.
- **Deu zero?** Ótimo sinal: quer dizer que nada foi pago fora do prazo. O documento em PDF
  registra isso também.
- **Fechou a página?** O rascunho fica guardado no seu navegador e volta na próxima visita.
- **Duas abas abertas?** Se as duas tiverem conteúdo diferente, o aplicativo avisa e deixa
  você escolher qual vale, em vez de apagar uma delas.

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
- **FGTS.** Depósito de 8% com vencimento no dia 20 do mês seguinte, juros de 0,5% por mês
  iniciado desde o vencimento e multa de 5% ou 10%, na forma do art. 22 da Lei 8.036/1990.
- **Dois regimes de juros.** Taxa fixa ao mês, com 1% como padrão, ou a taxa legal do art. 406
  do Código Civil na redação da Lei 14.905/2024, que é a Selic do mês menos o IPCA do mês, com
  piso em zero. No segundo caso cada mês entra com a sua própria taxa, buscada no Banco
  Central, proporcional aos dias em que a dívida existiu naquele mês. Com a correção ligada,
  os juros incidem sobre o valor já corrigido, como manda a Súmula 200 do TST.
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
- **Não conclui direito.** Três ou mais salários em atraso aparecem como fato apurado, com
  a referência ao Decreto-Lei 368/1968 e ao art. 483 da CLT, sem enquadrar a situação.
- **Não cobra mora antes do vencimento.** Uma parcela que ainda vai vencer na data da
  apuração aparece como "a vencer" e fica fora do total, pelo art. 397 do Código Civil.
- **Não dá por pago o que ainda não aconteceu.** Pagamento com data posterior à apuração é
  registrado, mas não quita nada, e a tela avisa.
- **Não estende a multa da convenção a férias e 13º por conta própria.** Só com a chave que o
  usuário liga, e o memorial declara a escolha.
- **Não dobra o abono pecuniário.** Nas férias fora do período concessivo, a dobra do art.
  137 alcança férias e terço; a venda de dias fica fora dela.

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
| Correção monetária do salário pago depois do 5º dia útil, a partir do dia 1º do mês subsequente (Súmula 381); juros de mora sobre a importância já corrigida (Súmula 200); dobra dos dias gozados fora do período de concessão (Súmula 81) | [Súmulas do TST](https://www.tst.jus.br/sumulas) |
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
npm test           # 97 testes: motor, tributos, parcelas, documentos, rascunho e PDF
npm run typecheck
npm run build
```

## Como está montado

```
src/lib/         motor de cálculo puro, sem React
  data.ts        datas em UTC, sem armadilha de fuso
  dinheiro.ts    dinheiro em centavos inteiros
  feriados.ts    calendário e 5º dia útil
  regiao.ts      feriados estaduais e municipais
  motor.ts       apuração de juros, multa e correção
  parcelas.ts    prazos de férias e décimo terceiro
  fgts.ts        encargos do FGTS em atraso
  tributos.ts    tabelas de INSS e imposto de renda de 2026
  documentos.ts  CNPJ numérico e alfanumérico, e CPF
  clausulas.ts   formatos de multa que se repetem nas convenções
  rascunho.ts    o que fica salvo no navegador, versionado e normalizado
  pdf.ts         memorial de cálculo
src/components/  interface
src/app/api/indices  ponte com o Banco Central
```

O motor é puro e coberto por testes cujos valores foram conferidos à mão no calendário antes
de a primeira tela ser desenhada. Onde existe exemplo oficial, ele virou teste: os dois casos
publicados pela Receita Federal para o redutor do imposto de renda e o CNPJ alfanumérico
"12.ABC.345/01DE-35" divulgado pela própria Receita e pelo Serpro.

## Aviso

Ferramenta de apuração. Não é parecer jurídico, não é laudo pericial e não substitui a
análise de profissional habilitado nem a convenção coletiva da categoria.

---

Desenvolvido por [Ary Ribeiro](https://www.linkedin.com/in/aryribeiro)
