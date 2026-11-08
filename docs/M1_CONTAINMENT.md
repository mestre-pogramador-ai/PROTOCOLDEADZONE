# M1 — Sala de Contenção (blockout funcional)

## Escopo entregue

- Mapa fixo autoral de 16 × 16 m com corredor conectado de 12 × 4 m.
- Paredes de 3,5 m, porta deslizante de teste com vão de 2,9 m.
- Props modulares (cápsulas, console, caixas e gabinete).
- Geometria e colisões Rapier provenientes do mesmo manifesto de módulos.
- Grafo de navegação descritivo com conexão condicionada à porta (sem pathfinding ainda).
- Luzes de emergência ciano/vermelho, materiais de blockout e corpo de teste físico.
- Controle de porta pela UI, com colisão habilitada/desabilitada junto ao estado visual.

## Limites deliberados

Este é um **blockout 3D funcional**, não arte 3D final: os módulos são malhas simples e materiais de referência. Não há modelos GLB finais, texturas PBR, animação da porta, IA, FPS jogável, compras ou economia. A câmera é uma visão de inspeção fixa; o controle FPS será desenvolvido no M2. A porta pode ser acionada pela UI sem distância de interação; essa regra será substituída por interação contextual em M2/M5.

## Validação

`npm test` executa os testes do mapa e os testes M0. `npm run build` verifica TypeScript e build de produção. A validação visual, colisão de todos os módulos e testes em navegador exigem execução local. Não declarar M1 final aprovado até inspeção visual e testes no dispositivo-alvo.

## Próximos marcos

M2: controlador FPS, pointer lock, interação E, colisão e câmera. M3: M9 e combate. M5: porta comprável, economia e rodadas.
