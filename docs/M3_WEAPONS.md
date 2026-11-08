# M3 — M9, tiro e apresentação FPS

## Implementado
- M9 autoritativa em `src/gameplay/weapons/M9.ts`: dano base 32, 360 RPM, carregador 15, reserva inicial **provisória** de 90, recarga 1,5s, multiplicador de headshot 2x para integração futura.
- `Runtime` processa `fire`, `ads`, `reload` no tick fixo de 60 Hz; pausa e reset preservam invariantes.
- Hitscan contra os módulos AABB estáticos da Sala de Contenção, inclusive porta fechada. A consulta é determinística e corresponde aos volumes de colisão do M1.
- Mira ADS com FOV visual reduzido e deslocamento do viewmodel, recoil visual, traçante e impacto.
- Viewmodel M9 **placeholder geométrico**: não é modelo 3D final, não tem rig ou animações de produção.
- HUD de munição, reserva e recarga. Controles: clique esquerdo disparar, direito ADS, R recarregar.

## Limitações e decisões pendentes
- M3 não inclui zumbis nem alvos com HP. O resultado do hitscan não aplica dano em entidades; isso pertence ao M4.
- O raycast usa AABBs do mapa e não a API de raycast Rapier; na integração de entidades dinâmicas, unificar a consulta física para evitar divergência de colisores.
- Tiros são calculados a partir da posição/visão da câmera; verificação de obstrução de cano e hit zones deverão ser adicionadas antes da aprovação final de combate.
- Sem áudio final, animação de recarga de mãos, recarga por evento animado, espalhamento de tiro, armamento secundário ou upgrades.
- A M9 usa um disparo por clique; a cadência máxima de 360 RPM é respeitada pelo controlador.
- A reserva inicial de 90 projéteis é uma hipótese do M3, não uma decisão de balanceamento dos documentos principais.

## Verificações locais
- `npm install`
- `npm test`
- `npm run build`
- `npm run dev`
- Testar WASD, captura do mouse, clique esquerdo, ADS, R, pausa, reset, porta fechada/aberta.

Não afirmar validação de runtime ou navegador sem executar os comandos e registrar evidências.
