# M6.2 — Estabilidade, combate e IA

Base: origin/main em 42a75db (M6.1.1), conferida antes das alterações.
Data: 08/11/2026 (America/Sao_Paulo). Node 24.22.1; npm 11.9.0.
GameClock, passo fixo de 60 Hz, balanceamento M9, economia e mapa preservados.
Nenhuma arma, setor, missão ou trabalho de M7 foi introduzido.

## Problemas e correções

### Movimento

Foi reproduzido recuo em corrida diagonal na quina nordeste: no tick 165,
posição [7.43000, 0.87497, -7.42992] passou para
[7.43012, 0.87500, -7.42100], contrário à intenção do jogador.
Ajustar normalNudgeFactor e desativar autostep não resolveu; essas tentativas
foram removidas. Não atribuímos todo relato anterior de recuo a esse único caso.

Quando o personagem está no chão e o resultado KCC tem componente contrária
à intenção superior a 1 mm, fazemos uma segunda consulta KCC com deslocamento
horizontal zero e a mesma intenção vertical. Aplicamos seu resultado, sem
teletransportar, escrever na câmera ou limitar coordenadas depois da colisão.
Isso pode interromper por um tick o avanço em uma quina; o jogador pode sair
dela alterando a direção. A ocorrência é contabilizada no diagnóstico.

Contato com teto interrompe velocidade ascendente, evitando insistência de
salto contra o teto. Snap, autostep, câmera interpolada e relógio central mantidos.
O agachamento conserva a velocidade reduzida e a câmera suave existentes;
a cápsula ainda não reduz de altura (limitação anterior).

### IA

- Adicionada consulta de percurso com amostragem máxima de 0,1 m.
  Tanto movimento quanto arestas BFS e correções de separação usam essa consulta.
  Antes, bastava o destino estar livre, permitindo pular um obstáculo intermediário.
- Reduzida tolerância de chegada a waypoint de 0,5 para 0,12 m para evitar cortar
  quinas antes de alcançar o ponto de navegação.
- A linha de visão agora inclui o destino, bloqueando ataques contra alvo
  obstruído; mantidos windup, active, recovery e compromisso de um dano por golpe.
- Delta inválido não avança estados dos infectados.
- Testada recuperação de 20 inimigos inicialmente sobrepostos; isso não garante
  separação instantânea em qualquer espaço sem capacidade física para a multidão.

### M9 e renderização

- ADS é desativado durante recarga e FOV acompanha adsBlend.
- Recoil visual usa M9.recoilKick; animação de recarga usa M9.reloadSeconds e
  retorna à pose neutra ao terminar, em vez de oscilar com constantes independentes.
- Deltas inválidos não corrompem cooldown, munição ou animação.
- Hitscan, headshots, oclusão, hit marker, dano e eventos de eliminação preservados
  e cobertos por regressão. Não foi encontrado motivo para reescrever hitscan.
- Removidas criações de Vector3/Quaternion a cada frame do viewmodel.
- A lista visual de infectados só é reconstruída quando o roster muda;
  leitura visual individual não cria snapshots. alive() deixou de alocar arrays.

### Diagnóstico

Esta base não continha BAIXAR ERROS nem handlers F8/F9. Foram implementados:

- Botão disponível inclusive nos menus; F8 marca ocorrência, F9 exporta JSON.
- Buffer de 256 registros, amostra por segundo simulado com posição, chão,
  velocidades, deslocamento solicitado/resolvido, contatos, vivos e rodada.
- Pausa, retomada, reinício, rodadas, falha de boot, erros do navegador,
  rejeições não tratadas e avisos de console. Intervenções contra recuo são
  agregadas por segundo para evitar inundar o buffer.
- Somente códigos fixos e dados numéricos/booleanos. Não coletamos mensagens
  arbitrárias, stack traces, URLs, storage, teclas digitadas, senhas ou tokens.
  Erros globais incluem linha/coluna quando disponíveis; mensagens de console
  continuam visíveis no console original. Essa restrição reduz detalhe textual.
- Remoção dos listeners no cleanup e revogação do Blob URL após download.

## Validação executada

- npm test: **85 testes em 15 arquivos aprovados**.
- npm run test:motion: **13 verificações aprovadas**.
- npm run build: **TypeScript e Vite aprovados**.
- git diff --check: sem erros.
- Nova suíte M62Stability: 20 testes cobrindo seis direções de corrida por
  600 ticks cada, velocidades limitadas e ausência de recuo acima do limiar;
  multidões 1/3/6/12/20; sobreposição; percurso por porta/armário;
  perseguição ao redor de pod; ataque bloqueado; recarga/ADS; headshots,
  oclusão, cadáveres; pausa/retomada/reinício; três rodadas com EnemyManager
  real; limites e privacidade do relatório.
- Chromium headless/SwiftShader: início, W, salto, pausa, F8, F9 e download JSON,
  botão BAIXAR ERROS disponível também na pausa, nenhum pageerror.
  O arquivo exportado continha a marca e as amostras esperadas.

## Métricas medidas

Uma execução local da suíte mediu 600 ticks adicionais de EnemyManager,
sem assertions no trecho cronometrado, após 600 ticks de aquecimento/validação:

| Infectados | ms / 600 ticks | média ms/tick |
| --- | ---: | ---: |
| 1 | 2,77 | 0,005 |
| 3 | 9,14 | 0,015 |
| 6 | 13,40 | 0,022 |
| 12 | 67,10 | 0,112 |
| 20 | 94,15 | 0,157 |

São métricas de CPU da IA neste cenário, sujeitas a variação de máquina,
JIT e concorrência com outras suítes. Não incluem renderização, física do
jogador, áudio, nem equivalem a FPS. Não foi medido antes/depois comparável;
a redução de alocações é constatada pelo código, não por um perfil de heap.
Os próprios testes imprimem novas medições para reprodução.

## Pendências de aceite manual e limites

- Confirmar visualmente movimento e câmera em teclado/mouse reais e monitores
  de taxas diferentes, incluindo 1/3/6/12/20 infectados, pausa, troca de aba,
  disparo rápido, abertura de porta e saída de quina.
- Testar qualidade de áudio, feedback visual, recoil e sensação de antecipação
  e recuperação dos ataques; o smoke não constitui aceite de qualidade visual.
- Agachamento físico sob tetos baixos continua pendente.
- Navegação é uma grade 2D com margem conservadora; infectados não são corpos
  Rapier e não possuem navegação vertical. Em gargalos a fila pode congestionar.
  Amostragem de percurso foi dimensionada para os sólidos do mapa atual.
- Separação continua quadrática; 20 foi validado, escalas superiores requerem perfil.
- Bundle continua com aviso Vite >500 kB (Rapier compat inclui WASM).
  Aviso interno de inicialização obsoleta do Rapier 0.17 permanece; API pública
  init() é a usada pelo runtime. Nenhum aviso foi ocultado.
- Não há medição de FPS em GPU real nem prova de ausência de vazamento em sessão longa.

## Revisão

Alterações divididas em commits de gameplay/renderização, diagnóstico e regressão.
Branch m6.2-stability preparada para revisão e integração; sem merge em main,
deploy, publicação do ambiente ou avanço para M7.
