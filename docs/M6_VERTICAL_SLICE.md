# M6 — Vertical Slice / Primeira operação completa

## Objetivo

Converter os sistemas M0–M5 em um ciclo de partida coeso e testável: menu inicial → início
pela ação do usuário → preparação → hordas → recompensas e compra da porta → pausa e
retomada → derrota → relatório e reinício. **Este pacote não é o jogo completo.**

## O que mudou no M6

- Interface ocupa todo o navegador; menu inicial, pausa, configurações e relatório final
  são overlays acessíveis do jogo, sem painel de desenvolvimento externo obrigatório.
- HUD mostra rodada, fase, inimigos restantes, créditos, vida, M9 e interações.
- `SessionMetrics` conta segundos de simulação, tiros, acertos, headshots, dano,
  eliminações, resultados e gastos sem alterar a lógica do combate.
- `AudioDirector` escuta eventos do gameplay e sintetiza efeitos de áudio locais
  provisórios (tiro, impacto, headshot, recarga, dano, onda, porta, morte).
  **Áudio realista, trilha musical e assets GLB finais não estão incluídos.**
- Áudio só é habilitado por interação explícita do usuário, como exigem os navegadores.
  Contexto e listeners são descartados ao desmontar o aplicativo.
- Configurações de volume, mute, FOV, sensibilidade do mouse, dicas de controle e
  redução de movimento ficam no `localStorage`. Falha de armazenamento não impede a partida.
- Recorde local simples baseado em rodadas concluídas (e eliminações como desempate),
  sem perfil online ou telemetria.
- Ao ocorrer game over dentro de um tick fixo, `GameClock` não executa ticks restantes
  da mesma frame. Evita aplicar outros ataques após a derrota.

## Fluxo manual sugerido

1. Abrir a página e confirmar menu com **INICIAR OPERAÇÃO**.
2. Abrir configurações; testar mute, volumes, FOV, sensibilidade e dicas; voltar.
3. Iniciar partida; mouse em pointer lock; observar HUD e som após gesto.
4. Usar `T` para iniciar a primeira rodada sem aguardar 30 s.
5. Atirar, acertar cabeça, recarregar; conferir sons e saldo.
6. Pausar com `Esc`. Confirmar que inimigos, timer e recarga congelam.
7. Retomar via botão e confirmar restabelecimento da câmera.
8. Acumular >=750 CR; aproximar da porta e pressionar `E`. Confirmar compra única.
9. Sofrer dano até morrer; conferir resultados, precisão, duração e recorde local.
10. Reiniciar e garantir: 100 HP, M9 cheia, 500 CR, porta fechada, rodada 1,
    zero eliminações e recorde local preservado.
11. Mudar resolução do navegador e testar menu em tela cheia.
12. Verificar console do navegador e desempenho com 1, 3 e 6 infectados.

## Limites conhecidos

- Apenas Sala de Contenção + corredor, M9 e Infectado Comum. Sem boss,
  extração, armas alternativas, perks, mapa completo ou progressão de carreira.
- Assets de arma/infectado permanecem malhas procedurais; não representam arte final.
- Sons são placeholders sintetizados por Web Audio; não há áudio posicional nem música licenciada.
- Recorde no localStorage e preferências são locais, não são sincronizados.
- Não há garantia de 60 FPS sem medir nos dispositivos-alvo.
- Sem simulação física completa de corpo de inimigos; IA usa navegação local existente.

## Validação

`npm install && npm test && npm run build` com Node.js e dependências disponíveis.
O módulo de métricas, armazenamento, áudio sem contexto e interrupção do clock
é coberto por `src/tests/M6VerticalSlice.test.ts`. Executar os testes de todos
os marcos após a instalação. Inspecionar e registrar os resultados do navegador.
