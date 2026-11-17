# M8.1.1 — Plano técnico visual

Base: 4be7f92, M8.1 preservado no PR #6 (ainda não integrado à main).
Branch: m8.1.1-visual-overhaul; revisão dependente do M8.1.
Escopo exclusivamente visual; atributos, hitboxes, economia, IA e GameClock inalterados.

## Auditoria antes das alterações

- M9Viewmodel.tsx: caixas/cilindros e duas caixas como mãos. Somente ferrolho,
  rotação de recarga, recoil e flash simples; sem carregador móvel ou rig.
- InfectedView.tsx: caixas, cápsulas, esferas e cabeça icosaédrica, ~20 meshes
  por instância. Animação manual de grupos; sem esqueleto/AnimationMixer.
- Arquétipos reais: common/Comum, runner/Corredor, brute/Brutamontes,
  predator/Predador. Não existe um quinto Blindado nem habilidade adicional.
- public/assets contém somente README de manifesto. Sem GLB, texturas ou clips.
- AssetManager cacheia Promises genéricas, sem carregador especializado ou
  liberação explícita de geometrias/texturas.
- Scene controla simulação única, câmera interpolada e rotação autoritativa.
  O viewmodel deve observar essa câmera e jamais corrigir yaw/pitch do hitscan.
- ReloadDuration/ADS pertencem à M9; animações devem observar esses tempos,
  inclusive Mãos Rápidas, sem conceder munição por keyframe.

## Pesquisa inicial de bibliotecas

Candidatos verificáveis, sujeitos à inspeção do arquivo:
- Quaternius, 9mm Pistol / 9mmBeretta, Poly Pizza BoZWhFdsj4.
  GLB real baixado, 2.992 triângulos declarados; Slide/Trigger/Hammer separados.
  Página indica CC-BY 3.0; manter atribuição mesmo que outros packs do autor sejam CC0.
- Quaternius, Animated Zombie, Poly Pizza jkrEvQZb8J.
  GLB real baixado, skin e esqueleto com mãos/dedos, clips Idle/Walk/Run/Bite/Crawl,
  textura embutida; página CC-BY 3.0.
- para/MakeHuman, FPS arms (rigged only), OpenGameArt.
  Fonte CC0, .blend/.fbx em 7z, ~8k triângulos e textura 1024.
  Exige conversão local para GLB, ajuste de pose e luvas; ainda não declarado integrado.

Pesquisa também em Quaternius oficial, Google Drive público e OpenGameArt.
Resultados 2D de pistolas não servem como substituto 3D.
Google Search retornou 429 e DuckDuckGo desafio; bibliotecas foram acessadas diretamente.
Nunca importar modelos de jogos proprietários ou assets com licença indefinida.

## Fases e prioridades

A. Registrar auditoria e capturar baseline com a mesma câmera/cenário.
B. Validar M9 e braços: escala em metros, grip com dedos, peça móvel de carregador,
   ferrolho e material PBR; idle/walk/sprint/fire/reload/ADS/equip observacionais.
C. Integrar Comum rigado: altura/chão/cabeça compatíveis com volumes atuais;
   clips comandados pelo estado da IA, sem root motion na simulação.
D. Derivar somente as três variantes existentes: materiais/silhuetas moderadas,
   postura/cadência de clips; não aumentar volumes fora das hitboxes.
E. Otimizar, registrar licenças/tamanhos/triângulos, testar e capturar comparação.

## Direção e referência de qualidade

M9 com proporções de uma pistola militar real, ferrolho aberto e miras legíveis;
mãos anatômicas, luvas foscas e materiais distintos de metal/tecido/borracha.
Infectados humanoides com uniforme gasto, pele opaca, postura assimétrica;
silhuetas/cor comunicam papéis sem novos poderes. Iluminação legível,
sem depender de bloom, brilho plástico ou violência gráfica exagerada.
Referência é forma/função de equipamento real, não copiar arte de outro jogo.

## Riscos e mitigação

- Licença: guardar URLs, texto, atribuições, hashes e adaptações.
- Rig antigo/FBX: converter offline com Blender, conferir deformação/pose,
  não declarar rig/clips aprovados só porque exportou.
- Root motion e hitbox: remover translação horizontal dos clips, ajustar escala
  e eixo; manter centros de cabeça/tronco existentes e documentar diferenças.
- FPS camera: FOV de viewmodel independente, clip de perto e mão/arma sem colisão;
  recoil visual não pode mudar o raio.
- Desempenho: compartilhar geometria/textura, clonar esqueletos corretamente,
  limitar sombras e medir chamadas/triângulos/frames com até 20 instâncias.
- Lifecycle: descarregar clips/mixers e recursos compartilhados ao desmontar;
  erro de asset deve ser registrado e não derrubar a simulação.

## Critérios de aprovação

- GLB locais reais carregados, nenhuma textura/arquivo essencial remoto ou 404.
- Arma reconhecível e mesh humanoide substituem primitivos no fluxo normal.
- Ferrolho/carregador e mãos respondem a disparo/recarga, ADS estável;
  ammo só muda no controlador.
- Estados visuais acompanham IA e morte/remoção/reinício funcionam.
- Inspecionar screenshots antes/depois; declarar explicitamente o que permanecer
  provisório, como luvas/adaptações ou ausência de clips de morte no asset original.
- npm ci/test/tsc/build/test:motion e regressão de combate/Rapier aprovados.
- Registrar métricas efetivamente medidas; SwiftShader não comprova 60 FPS real.
- Sem M8.2, novos setores, missão final ou alterações de balanceamento.
