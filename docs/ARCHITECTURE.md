# PROTOCOL: DEAD ZONE — Fundação M0

## Arquitetura B
O `useFrame` do React Three Fiber alimenta o `Runtime.frame(delta)`. `GameClock` executa passos fixos de 1/60s e chama `PhysicsWorld.step(dt)`, que é o **único** local de stepping do Rapier. A cena lê `previousY/currentY` e interpola a apresentação com `alpha`.

## Decisões
- Integração física **B2**: `@dimforge/rapier3d-compat` diretamente, em adaptador próprio, para controle manual explícito.
- R3F com callback `useFrame` em prioridade negativa: não toma posse do render automático.
- React/Zustand apenas para interface. Estado físico vive no Rapier.
- M0 demonstra um cubo físico, não é o jogo FPS.
- `GameClock` limita ticks atrasados e registra tempo descartado. Reavaliar política de tempo e latência em M2/M3.
- O loop não deve avançar quando a sessão estiver pausada.

## Limitações atuais
- Input básico captura teclado; não implementa pointer lock, mira ou remapeamento.
- AssetManager é cache de promises; loaders GLB, descarte de GPU, refcount e cancelamento ficam para marcos posteriores.
- O fluxo de inicialização tem proteção de desmontagem React, mas não inclui telemetria ou recuperação avançada de WebGL.
- Testes de navegador e hardware devem ser feitos no ambiente de destino.


## Atualização M6.1 — Controller cinemático

`PhysicsWorld` cria uma cápsula **kinematicPositionBased** e um
`KinematicCharacterController` (KCC) manual. `PlayerController` aplica o movimento
corrigido do KCC à próxima posição cinemática, nunca usa `setLinvel` em um corpo
dinâmico. `GameClock` continua sendo o único dono dos ticks de 60 Hz. A câmera
interpola as poses Rapier sem afetar hitboxes. Veja `docs/M6_1_MOVEMENT_STABILITY.md`.
