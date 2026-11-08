# M4 — Infectado Comum e polimento do FPS

## Implementado
- Infected: máquina de estados determinística `idle → chase → windup → recovery`, interrupção breve por dano, morte única.
- EnemyManager: spawn fixo de 1 infectado, com configuração para 1–3; bloqueio por AABB expandida para colisores estáticos e porta.
- EnemyHitScan: tiro hitscan contra cabeça/corpo com prioridade de parede; M9 32 dano no corpo e 64 na cabeça.
- Vida do operador: 100 HP, ataque de 18 HP, game over, pausa e reinício.
- Viewmodel e HUD mantidos do M3, nova interface com viewport ampliado, indicador de acerto e dano.
- Infectado 3D **placeholder geométrico**, animado proceduralmente; ainda não é modelo GLB/rig final.

## Limites conhecidos / próximo refinamento
- Navegação local AABB é uma solução provisória, não navmesh. Pode ficar preso em obstáculos côncavos.
- Sem áudio final nem animações importadas. Não há ainda hordas, créditos, wave director, perks ou missão.
- O hitbox do inimigo é simplificado por duas esferas e não usa osso animado; futuro sistema deverá compartilhar física/collision queries.
- M4 usa um inimigo por padrão. Testes de 3 inimigos são feitos via `runtime.setEnemyCount(3)` em desenvolvimento.
- HUD atualiza a cada 80ms; simulação é fixa e não depende da frequência de React.

## Validação
`npm install`, `npm test`, `npm run build`, `npm run dev`. Teste manual de pointer lock, tiro, headshot, recarga, ataques, morte, pausa, reset e porta.
