# M7 — Variantes de infectados (v0.8.0)

## Base e escopo

Implementado sobre ebb98e2, branch m6.2-stability, após conferir origin e o PR #1.
O PR M6.2 ainda estava aberto; M7 depende dele e não o integra automaticamente.
O usuário escolheu o escopo de novos infectados nas rodadas R4/R7/R10+.
Como não havia especificação detalhada de M7, este documento define a primeira
implementação e seu balanceamento proposto.

Preservados o mapa, M9, créditos/recompensas, portas, GameClock, passo fixo,
colisões, pausas, reinício, persistência e diagnóstico F8/F9/BAIXAR ERROS.
Nenhuma nova arma, sala ou missão.

## Tipos e balanceamento

| Tipo | Primeira rodada | Vida × base da rodada | Velocidade m/s | Dano | Preparação s | Recuperação s | Identificação |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Infectado Comum | 1 | 1,0 | 2,0 | 18 | 0,45 | 0,90 | verde |
| Corredor | 4 | 0,7 | 3,2 | 14 | 0,35 | 0,80 | âmbar |
| Brutamontes | 7 | 1,8 | 1,35 | 28 | 0,80 | 1,30 | azul |
| Predador | 10 | 1,2 | 2,6 | 22 | 0,55 | 0,75 | magenta |

Todos mantêm alcance de 1,45 m, tolerância final de 0,12 m, fase ativa de
0,15 s, raio de navegação de 0,38 m e os mesmos volumes de hitscan.
O Brutamontes é um papel de resistência/dano, sem aumento de escala física
ou armadura que altere o multiplicador de headshot. Os modelos são placeholders;
cor de cabeça, torso e marcador peitoral distinguem as classes.
O Comum preserva exatamente seus atributos anteriores.

HP = max(1, round(HP base da rodada × multiplicador do tipo)).
A quota total, o limite simultâneo, o tempo de spawn e a preparação das rodadas
não mudaram. Ataques continuam causando no máximo um evento por preparação,
com checagem de alcance e obstáculos no instante do impacto.

## Composição determinística

O índice zero-based de spawn bem-sucedido da rodada determina o tipo,
com a seguinte prioridade:

1. R10+: índice divisível por 10 → Predador.
2. R7+: índice divisível por 6 → Brutamontes.
3. R4+: índice divisível por 4 → Corredor.
4. Demais → Comum.

Logo, o primeiro spawn na R4/R7/R10 apresenta o novo tipo, mas o Comum continua
presente. A ordem não depende de Math.random, FPS nem número de tentativas.
Falha de spawn não incrementa o índice e não pula uma variante.

RoundDirector fornece HP e tipo ao callback; Runtime usa o SpawnDirector
existente para a posição e só confirma o spawn após criar o inimigo.
EnemyManager preserva as APIs legadas com tipo Comum como padrão.
A navegação, separação e descarte de cadáveres são os mesmos para todos.

## Interface e diagnóstico

- Anúncio de quatro segundos ao iniciar R4, R7 e R10 identifica a nova ameaça.
- HUD mostra tipos vivos e contagens a partir da R4; mortos não entram na contagem.
- Cada spawn registra enemy.spawn.<tipo>, HP e rodada no buffer limitado.
- O relatório exportado passa a informar versão M7.
- package.json e metadados raiz do lockfile sincronizados em protocol-dead-zone
  v0.8.0; não houve atualização de versões das dependências.
  O lockfile antes ainda identificava M5/v0.6.0.

## Verificações realmente executadas

- npm ci --cache /tmp/protocol-npm-cache: 124 pacotes instalados.
- npm test: **105 testes, 16 arquivos aprovados**.
- npm run build: **tsc -b e Vite aprovados**, 83 módulos.
- npm run test:motion: **13 verificações aprovadas**.
- git diff --check: sem erros.

Nova suíte M7Variants com 20 testes:
limiares e composição até R30, dez rodadas completas com retries e HP escalado,
velocidade individual, preparação/um golpe por ciclo, bloqueio por cobertura,
morte, headshots/oclusão, 20 infectados mistos por 1.200 ticks (20 s simulados),
separação, composição sem cadáveres, pausa/retomada e reset.

Chromium headless com SwiftShader:
início/pausa do App e montagem de Scene/Runtime reais com um exemplar de cada tipo.
Quatro tipos presentes, renderizados e imagem inspecionada; nenhum pageerror.
A fixture temporária de renderização foi removida antes do build final.
O teste não simula uma partida humana completa até a R10.

## Aceite manual e limitações

1. Jogar até R4/R7/R10 e conferir anúncios e reconhecimento de cada tipo.
2. Conferir sensação de dificuldade, capacidade de desviar dos golpes e legibilidade
   das animações em teclado/mouse reais. Ajustes de balanceamento devem ser guiados
   por essas sessões; não declaramos o balanceamento final.
3. Confirmar percepção de cores em condições visuais diferentes; o HUD também
   oferece nomes e contagens, mas os modelos ainda não têm silhuetas próprias.
4. Validar partidas longas: a economia de munição pré-existente é limitada
   (M9 com 15/90, sem loja); novas variantes podem evidenciar esse limite.
5. Validar FPS/áudio/memória em hardware real. O cenário misto automatizado não
   equivale a garantia de 60 FPS nem validação de memória prolongada.
6. Permanecem os limites de M6.2: agachamento sem redução da cápsula, navegação
   2D, separação quadrática e possíveis filas em gargalos.
7. Permanecem os avisos de bundle grande e inicialização interna obsoleta do Rapier.
   Build aprovado não significa que esses avisos foram eliminados.

Entrega em branch separada, sem merge em main nem publicação do ambiente.
