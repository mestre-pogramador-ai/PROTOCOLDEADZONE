# M2 — Jogador FPS

Baseado no pacote M1. Inclui corpo dinâmico Rapier em cápsula, câmera em primeira pessoa, mouse-look via Pointer Lock, WASD/setas, corrida Shift, agachamento Ctrl/C, salto Espaço, interação E com porta e reinício.

## Arquitetura
- O único bridge de frame continua em `Scene.tsx` e alimenta `Runtime.frame`.
- `GameClock` executa ticks fixos; `PhysicsWorld` avança Rapier uma vez por tick.
- `PlayerController` traduz input e yaw em velocidade horizontal, mantendo velocidade vertical para gravidade e salto.
- Câmera e transformações são apresentação; colisões são autoritativas em Rapier.
- Pointer Lock liberado ao pausar/perder foco.

## Limitações conhecidas
- Grounding usa altura do piso principal; substituição por shape-cast/raycast para desníveis pertence a evolução de M2.
- Agachamento reduz altura visual e velocidade, mas ainda não altera o collider físico; passagens baixas não são suportadas.
- A porta é um protótipo de interação, sem custo em créditos.
- Modelos e animações finais não fazem parte de M2.

## Testar
`npm install`, `npm run dev`, `npm test`, `npm run build`. Verifique colisão com paredes, salto, retomada sem teclas presas, reinício e abertura da porta apenas próximo dela.
