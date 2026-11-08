# M5 — Relatório de validação disponível na geração do pacote

## Execuções efetivas

- **Inspeção de estrutura**: arquivos originais M4.2 extraídos; M0–M4.2 mantidos e módulos M5 acrescentados.
- **Compilação TypeScript estrita isolada**: os módulos `RoundDirector`, `SpawnDirector`, `EconomyManager`, `EnemyManager`, `Infected`, `Navigation`, `Separation` e o mapa de Contenção foram compilados usando o compilador TypeScript global `5.8.3` em modo `--strict`, sem erros. Esta verificação **não representa um build de toda a aplicação**.
- **Testes isolados com Node.js**: doze verificações de orçamentos, âncoras HP/cap, preparação, antecipação da rodada, falha de spawn, limite de simultâneos, conclusão e reset, pagamentos por hit, kill e rodada, compra idempotente, spawn válido e gestão dinâmica de inimigos. Todos passaram.
- **Verificação sintática**: parse TypeScript/TSX de todos os arquivos do projeto, sem erros.
- **ZIP**: integridade verificada por `unzip -t` após empacotamento.

## Bloqueios / não executados

- `npm install` falhou em modo offline (dependências não cacheadas) e excedeu o tempo de tentativa online. **Não foi possível rodar `npm test` (Vitest), `npm run build` (Vite/TS completo) ou testes E2E reais no navegador.**
- Testes visuais, integração com Rapier em browser, pointer lock, compra da porta via E e performance sob 36 infectados precisam ser executados no computador de desenvolvimento.

## Teste humano sugerido

1. `npm install && npm test && npm run build && npm run dev`.
2. Iniciar FPS e pressionar `T`. Confirmar oito inimigos em R1, no máximo seis simultâneos.
3. Concluir R1; confirmar saldo e bônus uma vez só.
4. Comprar porta 750 CR; confirmar que abre, não cobra de novo e fecha no reset.
5. Pausar na preparação e em combate; confirmar que simulação fica congelada.
6. Reiniciar com inimigos ativos e depois do game over; confirmar limpeza.
7. Repetir teste com rodadas altas e registrar FPS/memória, sem assumir aprovação de performance.
