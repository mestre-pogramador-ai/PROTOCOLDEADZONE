# M8.1.3 — Plano do ambiente atual

Base GitHub: `bd7ecbc`, M8.1.2/PR #8, preservando a cadeia M8.1/M8.1.1.
Main permanece `12afa63`; nova branch `m8.1.3-environment-polish`.

## Auditoria e limites

Scene.tsx instancia cada bloco com material/geometria próprios, vidro muito
opaco, console/caixas/armário sem detalhes e sinais parcialmente planos.
RoomSurfaces aplica a mesma textura de parede com escala UV fixa, inclusive
em módulos de tamanhos diferentes. Há duas luzes pontuais e uma luz com sombra.
Não existe teto visual/físico; somente paredes de 3,5 m.

Antes capturado no Chromium em sete câmeras fixas e cargas 0/4/20 infectados,
com o código visual M8.1.2, antes das alterações no renderer.

## Intervenção

- Preservar todos os módulos/objetos, posições, navegação, spawns e interações.
- Adicionar somente o fechamento superior em Y=3,5: um módulo de teto usando
  o tipo já existente e colisão Rapier. Evita atravessar o novo teto ao saltar
  sobre props. O salto normal no piso fica abaixo dele. Nenhum setor novo.
- Materiais de concreto, piso técnico, pintura gasta e metal, com UVs em metros,
  roughness e atlas de telas/sinalização originais e locais.
- Substituir o desenho de blocos por assemblies nos mesmos volumes: console
  inclinado, armário ventilado, caixas com fechos, pods com armação/vidro,
  estação de munição e carcaças das máquinas. Preservar rótulos/cores dos perks.
- Emoldurar paredes/porta, adicionar forro, perfis e serviço suspenso, sem criar
  obstáculos no centro ou nas aproximações. Storytelling de falha de contenção.
- Compartilhar materiais e agrupar geometria estática por superfície. Manter
  duas luzes pontuais sem sombras e uma única sombra direcional de 1024.
- Medir custos reais, não estimar 60 FPS. Armas, modelos e materiais dos personagens serão preservados.

## Validação

Testar limites das peças/atlas, orçamento de batches, rotas/linhas de tiro,
spawns, teto/salto com Rapier, porta, munição e perks; executar toda a suíte,
TypeScript, build e test:motion. Chromium com mesmas câmeras e workloads antes/
depois, smoke normal, compras, HUD e combate real. Documentar pendências.

## Ajuste descoberto na validação

O harness M8.1.2 encontrou uma transição visual do Brutamontes a 0,23657 m do
alvo da cabeça, acima da margem de teste 0,235 m. Acrescentada uma terceira
passagem CCD limitada no retarget existente e cobertura do esqueleto/clip real.
Nenhum modelo, material, estado da IA ou hitbox foi alterado. O ensaio completo
do Chromium passou mantendo a tolerância original.
