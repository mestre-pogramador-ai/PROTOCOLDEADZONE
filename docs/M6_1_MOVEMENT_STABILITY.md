# M6.1 — FPS Movement Stability

## Objetivo

Corrigir o recuo perceptível ao caminhar contra paredes/props da Sala de Contenção. O M6
usava um **rigid body dinâmico** e reimpunha a velocidade horizontal a cada tick com
`setLinvel`. Uma colisão podia produzir uma correção de penetração aparentemente oposta
à intenção do jogador; no tick seguinte a mesma velocidade voltava a empurrar a cápsula.

**Mudança:** o personagem agora é um `kinematicPositionBased` com um
`KinematicCharacterController` do Rapier, usando `computeColliderMovement` para calcular
a translação permitida, então `setNextKinematicTranslation` e `world.step` no mesmo tick.
Esse é o padrão documentado pelo Rapier. A explicação anterior é uma hipótese técnica
plausível para o vídeo, não uma prova instrumental da causa original.

## Propriedade e ciclo de atualização

1. `Scene` recebe `useFrame` do R3F e chama `Runtime.frame` **uma única vez**.
2. `GameClock` entrega ticks fixos de 1/60 s, até quatro por frame (como no M6).
3. `Runtime` lê um snapshot de input, e `PhysicsWorld.step` solicita movimento horizontal
   + gravidade/salto ao `PlayerController`.
4. `PlayerController` calcula os deslocamentos via `MovementMath`, consulta o KCC
   (shape-casts, deslizamento, autostep e snap) e agenda a translação corrigida.
5. `PhysicsWorld` chama `world.step` uma vez. Sua pose autoritativa vem do Rapier.
6. `Scene` interpola apenas a câmera entre as duas poses confirmadas. A renderização
   **nunca** escreve de volta na simulação.
7. No início/retomada, `syncInterpolation()` descarta a pose visual defasada.

## Configurações atuais

| Parâmetro | Valor |
| --- | --- |
| Tick de simulação | 60 Hz |
| Cápsula | raio 0,38 m; meia altura cilíndrica 0,48 m |
| Margem KCC | 0,015 m |
| Movimento | 4,6 m/s, corrida 7 m/s, agachado 2,5 m/s |
| Salto | 5,3 m/s inicial; gravidade -9,81 m/s² |
| Velocidade de queda terminal | 32 m/s |
| Contato no chão | `computedGrounded()` do KCC |
| Autostep | até 0,26 m, mínimo 0,19 m de espaço livre |
| Snap-to-ground | até 0,28 m |
| Inclinação máxima | 45 graus |
| Colisões | cápsula kinemática contra os módulos de colisão existentes |

Os controles WASD/Shift/Ctrl/C/Esp/Esc e o restante do M6 não mudaram.

## Diagnóstico opcional

Abra `http://localhost:5173/?debugMovement=1` (respeitando a URL que o Vite mostrar)
para ver estado de chão/ar, velocidade vertical, contatos KCC, deslocamento solicitado
e deslocamento autorizado. Esse painel **não altera** a física nem o input.

## Roteiro manual de aceitação

1. Inicie o jogo; parado, o estado deve passar de AR para CHÃO quando a cápsula pousar.
2. Segure W em direção à parede norte por 5 segundos: pare na parede sem recuar.
3. Pressione W+D encostado na parede: deslize de lado sem atravessá-la.
4. Corra contra uma quina, solte as teclas: o personagem deve permanecer parado.
5. Pule após estar no chão: suba e caia normalmente; Space no ar não gera pulo duplo.
6. Ande sobre pequenas transições de piso, se existirem; sem saltos bruscos de câmera.
7. Agache e levante (Ctrl/C): a câmera muda de altura suavemente.
8. Compre/abra a porta por 750 CR e atravesse sem colisão invisível.
9. Pause, alterne aba, retome e reinicie diversas vezes: nenhuma pose antiga deve aparecer.
10. Repita com 1, 3 e 6 infectados e durante uma rodada ativa; observe frame pacing.

## Limitações e próximos refinamentos

- A câmera do agachamento é visual; a cápsula física permanece com a altura original.
  Redimensionar a cápsula requer checagem de folga acima da cabeça e será tratado
  futuramente para impedir levantar-se sob tetos baixos.
- A precisão das colisões depende do mapa modular existente, ainda em blockout.
- O KCC resolve movimento relativo a obstáculos do Rapier; os infectados do M6
  continuam usando sua navegação/representação próprias, não são colliders dinâmicos
  Rapier. Separação dos inimigos não equivale a física de multidão.
- Testes automatizados de integração exigem instalar o pacote WASM do Rapier e Vitest;
  a confirmação visual de ausência de recuo requer executar o jogo no navegador.
- FPS 60 e latência de câmera não foram medidos neste ambiente.

## Referência técnica

Documentação oficial do Rapier: https://rapier.rs/docs/user_guides/javascript/character_controller/
