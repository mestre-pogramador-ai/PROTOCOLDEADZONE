# M8.1 — Perks, máquinas e progressão

Data: 09/11/2026 (America/Sao_Paulo). Versão 0.9.1.
Branch: **m8.1-perks**.
Resultado: **139 testes aprovados, 0 reprovados; build e validação local de navegador aprovados**.
Não jogamos o FPS manualmente nem iniciamos M8.2.

## Base e fluxo de integração

Antes de implementar, main ainda estava em 65de3b3 e o M7.1 no PR #5.
Repetimos npm ci, os 119 testes do M7.1 e o build: aprovados.
Integramos o PR #5 pelo merge normal do GitHub, preservando os commits.
Base efetiva do M8.1: **12afa634bb213ea550c762ba2f7b662ad1a34854**,
merge do M7.1 na main, confirmado no GitHub.

Commits desta entrega:
- **6fc9396**: arquitetura, efeitos, integração, máquinas e HUD.
- **11274d5**: regressões, economia R1–15 e ferramentas de navegador.
- Commit posterior de entrega: metadados v0.9.1, evidências e este relatório.

Nenhum histórico foi reescrito; a atualização M8.1 fica em PR para revisão,
sem merge automático em main.

## Alterações implementadas

### Arquitetura

- PerkRegistry: catálogo validado e definições congeladas, com identidade,
  preço, descrição e modificadores. Rejeita IDs duplicados e valores inválidos.
- PerkManager: no máximo quatro aquisições únicas por sessão; valida créditos
  e recibos via EconomyManager. Comprar novamente não cobra, cura ou acumula.
- PerkEffectResolver: recalcula efeitos a partir de ownership único;
  duplicações no conjunto de entrada não multiplicam o mesmo efeito.
- Modificadores resolvidos são cacheados e lidos pela simulação, sem novo
  cálculo de catálogo a cada frame.
- Condutor e Pulmões de Ferro têm apenas IDs reservados. Não há preços, máquinas
  ou efeitos improvisados para esses perks; compras são indisponíveis.

### Perks

| Perk | Preço | Efeito implementado |
| --- | ---: | --- |
| Vitalidade | 2.500 CR | Máximo 150; soma 50 à vida atual, preservando o dano sofrido |
| Mãos Rápidas | 2.000 CR | Duração da próxima recarga ×0,75: M9 1,5 → 1,125 s |
| Impulso | 2.000 CR | Velocidade horizontal ×1,12, inclusive corrida/ADS/agachamento |
| Blindagem Reativa | 3.500 CR | Dano recebido ×0,85; HP arredondado a duas casas |

Vitalidade: 100 → 150 se saudável; 60 → 110 se faltavam 40 HP.
Não ressuscita, não fornece cura repetida e não altera a invulnerabilidade.

M9 continua sendo a autoridade do estado de recarga; não havia um
ReloadController separado a substituir. Sua duração é capturada no começo:
comprar Mãos Rápidas durante uma recarga mantém a atual e altera a seguinte.
A animação usa a mesma duração capturada.

Impulso altera somente a intenção horizontal antes do KCC do Rapier.
Não escreve em poses confirmadas, não altera gravidade/salto nem cria outro clock.
Blindagem mantém a janela de 0,65 s de invulnerabilidade existente.

Morte limpa perks e efeitos sem reanimar o jogador nem devolver os créditos.
Reinício limpa perks, compras, recibos, saúde, tempos e os modificadores,
restaurando os padrões do M7.1.

### Máquinas, HUD e interação

Quatro máquinas físicas junto à parede sul da Contenção:

| Perk | X | Z |
| --- | ---: | ---: |
| Vitalidade | -3 | 7,1 |
| Mãos Rápidas | 0 | 7,1 |
| Impulso | 3,5 | 7,1 |
| Blindagem Reativa | 6 | 7,1 |

Os sólidos pertencem ao mapa compartilhado por Rapier, hitscan e navegação.
Os pontos originais de spawn e as aproximações frontais permanecem livres
nas verificações automatizadas; a porta e a estação de munição não foram movidas.

Cada máquina tem cor, placa com nome/preço e interação E a menos de 1,8 m.
A máquina mais próxima determina o perk. O prompt mostra preço, efeito e estado,
incluindo já adquirido. Há mensagem e áudio de compra/negação pelos eventos existentes.

HUD mostra até quatro badges com letra, nome e cor; barra de vida foi
normalizada pelo máximo atual. Atualização de perks/créditos/saúde ocorre
pelos eventos confirmados, sem depender de uma leitura por frame.
BAIXAR ERROS, F8/F9 e os indicadores anteriores foram mantidos.
Relatórios exportados identificam M8.1 e registram os resultados das compras.

## Comandos executados

Ambiente: Node 24.22.1, npm 11.9.0, Chromium headless e SwiftShader.

| Comando | Resultado final |
| --- | --- |
| npm ci --cache /tmp/protocol-npm-cache | 124 pacotes instalados |
| npm test | **139 aprovados, 0 reprovados, 22 arquivos** |
| npx tsc -b | aprovado, sem erros |
| npm run build | aprovado; 89 módulos; JS 3.582,75 kB / gzip 1.222,26 kB |
| npm run test:motion | 13/13 verificações aprovadas |
| git diff --check | sem erros |

Os testes existentes M0–M7.1, integração Rapier/KCC, munição, combate,
perseguição, separação, pausa, reinício e rodadas foram repetidos.

M81Perks adiciona 17 testes, cobrindo:
aquisição de cada tipo, saldo insuficiente, IDs reservados, quatro slots com
uma quinta definição neutra somente de fixture, recibos duplicados, remoção,
cura/maxHP, recarga ativa e seguinte, redução de dano/invulnerabilidade,
velocidade, salto, parede/quina, posições/spawns e morte/reset do Runtime.

M81EconomyProgression adiciona três cenários finitos até R15, com as armas,
danos, pagamentos, recargas, compras e saldo reais. Logs completos em
[docs/validation/M81](docs/validation/M81).

## Economia das rodadas 1–15

Custos fixados pelo escopo: 10.000 CR para os quatro perks.
Mantivemos preços da munição/porta, HP dos infectados, dano, cadência,
recompensas e quotas existentes.

Política testada: comprar porta com saldo >=1.000; comprar cada perk assim
que puder pagar e manter pelo menos 360 CR para duas caixas de munição.
Essa política favorece inicialmente os perks de 2.000, não obriga comprar na
ordem do catálogo. Sem dinheiro/balas concedidos artificialmente nesses testes.

| Cenário | Inimigos mortos | Disparos | Compras de munição | Saldo final R15 |
| --- | ---: | ---: | ---: | ---: |
| Headshots 100% | 380 | 1.381 | 44 | 31.200 CR |
| Corpo 80% | 380 | 3.261 | 107 | 13.480 CR |
| Corpo 67% | 380 | 3.913 | 128 | 9.700 CR |

Todos os cenários compraram os quatro perks, munição e porta, sem socorro gratuito.
Em cada tick, saldo = 500 + ganhos - gastos, saldo >=0.
Conservação de munição: disparos + munição restante = 105 + balas compradas.
Gasto final = 750 + 10.000 + 6 × balas compradas.

Rodadas de aquisição:

| Cenário | Mãos Rápidas | Impulso | Vitalidade | Blindagem |
| --- | ---: | ---: | ---: | ---: |
| Headshots 100% | R3 | R4 | R6 | R7 |
| Corpo 80% | R4 | R5 | R7 | R9 |
| Corpo 67% | R4 | R5 | R7 | R10 |

[Dados por rodada e transações](docs/validation/M81/economy.json).

Isso demonstra viabilidade econômica com consumo finito, não uma partida humana
contra hordas. Como no M7.1, posição/spawn, mira e erros são programados em
uma linha de tiro com um alvo vivo por vez. Navegação/pressão/risco de alcançar
máquinas são validados separadamente e exigem aceite manual.

### Excesso de créditos

Os perks absorvem 10.000 CR, mas o saldo R15 ainda é positivo e alto,
especialmente com headshots. Isso confirma o excesso observado no M7.1;
não justifica uma redução grande sem medir partidas reais.

Recomendações para uma análise posterior:
- medir rodada da compra, precisão, dano recebido e viagens às máquinas;
- comparar ganhos por hit, morte e bônus de rodada com custos acumulados;
- testar pequenas alterações de uma variável por vez, preservando viabilidade
  para precisão intermediária e sem retirar a proteção contra falta de munição;
- avaliar conteúdo/economia futuros somente com escopo próprio.

Nenhuma dessas mudanças de recompensas ou mecânicas futuras foi aplicada.

## Testes do navegador

### Build normal, sem financiamento de teste

Vite Preview em localhost:4173; script validate-m71-browser.cjs com versão
esperada M8.1. Confirmou início/HUD, disparo, recarga, estação de munição
(500 → 494 CR por uma bala), limite de reserva, rodada, pausa/retomada/reset,
F8/F9, BAIXAR ERROS e ausência de sobreposição sobre créditos.
**Zero erros JavaScript/console ou HTTP.** Crédito inicial continuou 500.

[Resultado](docs/validation/M81/production-browser.json) e
[relatório exportado](docs/validation/M81/production-diagnostics.json).

### Fixture de perks compilada em modo de produção

O build padrão não tem comando de créditos de teste. Para testar as quatro
compras em tempo razoável na nuvem, uma entrada separada em tools/browser-fixtures
monta o App/Runtime reais com 15.750 CR pré-carregados por recompensas de fixture.
Ela fornece observação de estado e um comando para criar um atacante real.
Não faz parte do dist normal; verificamos que os identificadores de fixture
não aparecem nele. O App usa sua fábrica normal por padrão.

Essa fixture NÃO comprova que é possível obter esses créditos na R1.
A viabilidade sem financiamento é comprovada pelos testes econômicos R1–R15.

Comandos:

```sh
node tools/build-perk-fixture.mjs
npm run preview -- --outDir /tmp/m81-perk-build --port 4174
NODE_PATH=/tmp/protocol-browser/node_modules node tools/validate-m81-browser.cjs
```

O Playwright estava instalado em /tmp/protocol-browser nesta sessão.
Scripts permitem configurar URL, binário Chromium e diretório de evidência.

Fluxo realizado por teclado e mouse automatizados:
- início, deslocamento com colisões até as quatro máquinas e compra com E;
- desconto exato de 2.500/2.000/2.000/3.500 CR;
- vida máxima/current 150, badges e mensagem de perk já adquirido sem débito;
- compra durante recarga mantém 1,5 s; seguinte passa para 1,125 s;
- Impulso ativo e navegação entre máquinas;
- atacante real da IA aplica um golpe de 18 reduzido para **15,3**, HP **134,7**;
- pausa preserva estado, exportação com marca F8 e versão M8.1;
- reinício remove quatro perks, restaura 100 HP, 500 CR e 15/90;
- nova tentativa sem saldo é negada sem perk nem débito;
- bounding boxes confirmam badges sem sobreposição com os demais blocos HUD.

**Zero erros JavaScript/console** na fixture. O aviso interno de init do Rapier
continua presente; não foi ocultado. Não fizemos julgamento de áudio por audição.

[Log/estados](docs/validation/M81/perks-browser.json),
[diagnóstico](docs/validation/M81/perks-diagnostics.json),
[máquina Vitalidade](docs/validation/M81/vitality-machine.png),
[quatro perks no HUD](docs/validation/M81/four-perks.png).

## Problemas corrigidos e ajustes de validação

- Saúde/HUD tinham máximo fixo 100: máximo configurável e barra proporcional,
  sem cura duplicada ou ressurreição na remoção dos efeitos.
- Recarga/animação usavam duração fixa: duração capturada no início e partilhada
  com a animação para não saltar de fase na compra durante recarga.
- Modificadores são derivados da posse, evitando incremento repetido na aquisição.
- Máquina/efeito fica selecionado por distância; não há substituição da munição/porta.
- O primeiro teste de salto comparava personagens que haviam andado distâncias
  diferentes; correções milimétricas de contato do KCC geravam falso erro.
  Separamos movimento horizontal e salto na mesma posição: salto/velocidade
  vertical idênticos, e movimento solicitado precisamente ×1,12.
  A comparação de deslocamento físico horizontal admite tolerância de 0,002
  na razão por conta das correções de contato, sem alterar código de física
  para satisfazer o teste.

## Pendências, hospedagem e limitações da nuvem

- Não jogamos manualmente o FPS. Permanecem pendentes sensação de movimento,
  dificuldade, alcance sob pressão, áudio e reconhecimento visual em combate.
- Sem medição de FPS em GPU real, profiling de memória de longa duração
  ou prova de desempenho de R15 com uma horda simultânea na nuvem.
- Máquinas/ícones/modelos são provisórios; navegação 2D, agachamento sem redução
  de cápsula e separação quadrática continuam como no M7.1.
- Build mantém aviso de bundle >500 kB (~3,58 MB JS, incluindo WASM);
  Rapier 0.17.3 mantém aviso interno de inicialização obsoleta.
- Antes do merge M7.1, Netlify Preview falhava e Vercel informava que o autor
  do commit precisava de acesso ao projeto. São pendências externas de deploy/
  permissões, não corrigidas com alterações de gameplay nem declaradas aprovadas.
- Evidências deste relatório são de build local, não de um domínio hospedado.
- Morte/reset perdem perks sem reembolso, conforme escopo. Não há salvamento
  permanente, venda de perks, Condutor ou Pulmões de Ferro.

## Recomendação para M8.2

O escopo automatizado do M8.1 está validado e preparado para revisão/integração.
Recomendo definir M8.2 após revisar/integrar este PR e fazer um smoke humano
das quatro máquinas em partida real. O excesso de créditos e os limites de
performance devem continuar explícitos; não condicionamos a aprovação a
testes visuais/manuais que não executamos.

M8.2 não foi iniciado. Apenas o M7.1 foi integrado nesta tarefa; M8.1 permanece
em sua branch de revisão, sem publicação do ambiente.
