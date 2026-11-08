# Changelog M6 — 0.7.0

## Adicionado

- Fluxo integrado de abertura, pausa, configuração, derrota, relatório e reinício.
- HUD de sobrevivência totalmente sobreposto à área 3D (sem painel externo).
- Métricas de tiro, precisão, headshot, duração, dano e economia.
- Recorde local simples, com recuperação de dados inválidos.
- Preferências persistentes de áudio, FOV, sensibilidade, dicas e redução de movimento.
- Sons locais gerados com Web Audio; AudioContext só começa após clique.
- Eventos de gameplay para tiro, headshot, dano, recarga, rodadas, compra e morte.
- Vitest para métricas, storage, settings, áudio sem contexto e congelamento de ticks.

## Corrigido

- Pause/derrota dentro do tick interrompe todos os passos de simulação restantes.
- Reinício limpa métricas e dispara novo ciclo de sessão.
- Botões de retomada não podem carregar um clique do menu como tiro.
- Reset dos disparos da M9 não dispara recoil visual falso.

## Preservado

- Jogo FPS, Rapier em stepping manual, único GameClock, Sala de Contenção,
  M9, IA do Infectado Comum, spawn, rounds, economia, transações idempotentes,
  M4.2 refinements e todos os testes e documentos anteriores.

## Não incluído

- Modelos/animações GLB finais, sons gravados/trilha, novos setores, novas armas,
  outros infectados, progressão permanente, chefe ou extração.
