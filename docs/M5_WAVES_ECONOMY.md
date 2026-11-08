# M5 — Rodadas, hordas, créditos e economia

## Escopo
M5 integra ondas de Infectados Comuns **no cenário autoral da Sala de Contenção**. Mantém R3F/Three.js/Rapier e o GameClock de 60Hz do M0–M4.2. Não inclui outras classes de inimigo, lojas de armas, perks, missões secretas nem o restante da instalação. Os inimigos ainda são placeholders procedurais, não GLBs finais.

## Rodadas
- Começa com **500 créditos** e pistola M9 (15/90).
- Preparação automática: R1–3 30s; R4–7 25s; R8–12 22s; R13–20 20s; depois 18s. **T** começa cedo.
- Fórmula de orçamento: `ceil(5 + 2*r + .15*r^1.5)`; R1 = 8, R5 = 17, R10 = 30, R20 = 59.
- Limite **simultâneo**, diferente da quantidade total, interpolado entre âncoras: R1 6, R5 10, R10 16, R15 22, R20 28, R30 36.
- Saúde base escalonada do Infectado Comum: R1 100, R5 135, R10 190, R15 250, R20 310, R30 400.
- Um inimigo só consome cota se a criação for bem-sucedida; não avança se houver vivos/pendentes. Ao limpar a rodada, a recompensa é concedida **uma vez** e a próxima preparação começa.
- PAUSA/BLUR congelam o relógio de simulação e todos os temporizadores de gameplay. `reset()` descarta inimigos, progresso, compra da porta e saldo.

## Economia (transações idempotentes por sessão)
- +10 créditos por hit confirmado por inimigo, máximo **cinco hits pagos por inimigo**; deduplicação por par (`enemyId`, `shotId`).
- Morte comum: +60; morte por headshot: **+90 substituindo** os 60; uma única recompensa por `enemyId`.
- Bônus de rodada completa: `50 + 10*r`; uma única recompensa por rodada.
- Porta entre Contenção e Corredor: **750 créditos**, via E na proximidade. Pagamento é atômico: sem saldo nada acontece. Após comprar, fica aberta nesta partida, sem nova cobrança. Restaura o estado original ao reiniciar.
- Interface mostra saldo, última transação, rodada, tempo de preparação, infectados restantes, eliminações, vida e munição.

## Nascimento de inimigos
- Pontos autorais fixos em `SpawnDirector.ts`; preferência por distâncias maiores que 12 metros e pontos fora do cone de visão, com deslocamentos locais testados contra colisões.
- **Limitação de M5:** Sala de Contenção tem apenas 16 × 16 m, então nem sempre é possível manter 12 m. Há fallback >=6.5m, documentado, para evitar travamento da rodada. Testar pessoalmente spawn off-camera e pontos seguros.
- O `EnemyManager` agora usa IDs sequenciais e recicla cadáveres após 2.5s; a camada R3F cria/destrói instâncias visuais quando os IDs mudam, sem rerenderização da UI por tick de física.
- Neste marco, todas as rodadas têm só o Infectado Comum; a introdução de outras classes em R4/R7/R10+ depende de M7.

## Arquitetura / invariantes
- `Runtime` é o orquestrador, `RoundDirector` controla quotas/tempo/limites, `EconomyManager` controla saldo e idempotência, `EnemyManager` detém vida/IA/instâncias, `SpawnDirector` escolhe pontos válidos.
- Não há `setInterval` para gameplay; apenas amostragem de **interface** em 80ms.
- Enemies e rewards são ressetados a cada nova sessão. Recompensa da rodada só ocorre se `remainingToSpawn===0` e `alive===0`.
- `setEnemyCount` e `setDoorOpen` continuam disponíveis como hooks legados de depuração do M4, mas a interface do M5 não expõe essas ações, para não interferirem com os sistemas oficiais de hordas e economia.

## Como validar
1. `npm install`, `npm test`, `npm run build`, `npm run dev`.
2. Pressionar **INICIAR**, depois T; confirmar R1, oito spawns distribuídos com máximo seis vivos.
3. Mirar na cabeça; confirmar +10 por tiro e +90 em morte com headshot, sem crédito por atirar na parede.
4. Com >=750 CR, aproximar-se da porta e pressionar E; confirmar -750 e corredor liberado. Com saldo insuficiente, não abrir.
5. Matar todos os oito; validar +60 CR pela conclusão da rodada e início da preparação R2.
6. Pausar durante o countdown, aguardar alguns segundos e retomar: o timer não deve ter avançado durante a pausa.
7. Reiniciar após a compra da porta e após uma morte: saldo 500, R1, porta fechada, 0 eliminações e sem inimigos residuais.
8. Observar FPS e navegação com >=6 inimigos; essa validação precisa ser feita em navegador real.

## Limites conhecidos
Não executamos um teste visual automatizado de navegador neste pacote. O cenário pequeno pode concentrar hordas nas entradas em rodadas altas. Não há áudio final, assets GLB finais, diretoria adaptativa de hordas nem sistema completo de perks/loja. Performance de R20+ não deve ser considerada aprovada sem profiling.
