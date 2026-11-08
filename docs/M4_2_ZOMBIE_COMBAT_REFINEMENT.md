# M4.2 — Zombie Combat Refinement

## Alterações
- Separação determinística de até seis infectados vivos, com validação contra a geometria de colisão do mapa.
- Aplicação de dano do jogador com janela de invulnerabilidade e origem do último ataque; indicador direcional no HUD.
- Ajustes de animação procedural para preparação, golpe, reação e morte.
- Detalhes industriais não colidíveis: tubulações, avisos, faixas de piso e painéis.
- Legibilidade do HUD em vida crítica e no modo tela cheia.

## Limitações
- Modelo humanoide e M9 continuam provisórios. Não há GLB rigado, áudio final ou VFX de produção.
- Separação local não substitui navegação em navmesh para mapas complexos.
- Não há implementação de hordas, rodadas ou créditos (M5).

## Validação manual
1. `npm install`, `npm test`, `npm run build`, `npm run dev`.
2. Testar 1, 3 e 6 infectados, portas abertas e fechadas, pause/restart, headshots e tiros bloqueados por paredes.
3. Confirmar que cada golpe causa dano no máximo uma vez e que a seta de dano indica a direção aproximada.
4. Conferir FPS, sobreposição, colisões e consumo de memória no navegador.
