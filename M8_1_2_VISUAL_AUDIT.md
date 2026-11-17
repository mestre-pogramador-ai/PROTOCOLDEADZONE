# M8.1.2 — Auditoria e plano de correção visual

Base preservada: `1218827`, M8.1.1/PR #7, dependente do M8.1/PR #6.
Ambos ainda abertos; main permanece no merge M7.1 `12afa63`.
Nova branch `m8.1.2-visual-quality`, sem sobrescrever commits anteriores.

## Diagnóstico antes das mudanças

- As capturas de M811 mostram punhos grandes, mãos entrelaçadas por trás da
  pistola, polegares verticais e pouca leitura do ferrolho/empunhadura.
  A pose dos metacarpos foi orientada para cima em vez de acompanhar o cabo;
  projetar vértices contra uma caixa não resolve a anatomia da empunhadura.
- O enquadramento hip é alto/central. O ADS centraliza o mesh, mas a quantidade
  de mão em torno da mira e o momento da captura dificultam a leitura.
- M9Viewmodel já separa render e gameplay; preservar essa arquitetura.
  Idle/walk/sprint/fire/ADS/equip são curvas; SupportReload é clip esquelético.
- Todos os infectados usam o mesmo Quaternius de 2.116 tris e a mesma roupa,
  diferenciados quase só por cor e largura. A textura e o rosto são estilizados.
  A morte é uma pose Crawl adaptada, sem morte própria.
- Cena: cores de parede uniformes, sinais sem texto e poucos detalhes;
  preservar primeiro arma/personagem e só depois trabalhar apresentação.
- Regressão conhecida de frame time no SwiftShader; não assumir 60 FPS.

## Pesquisa efetiva e candidatos locais

Arquivos foram baixados para `/tmp/m812-research` e inspecionados, sem declarar
que downloads candidatos já estejam integrados no jogo:

- Pixel32, **textured pistol**, OpenGameArt `/content/textured-pistol`, CC-BY 3.0:
  fonte Blender de uma pistola Beretta 92 com diffuse/specular 1024 e peças
  modeladas separadas. Priorizar sobre o modelo estilizado sem textura anterior.
- Pixelhouse, **zombie**, OpenGameArt `/content/zombie`, CC-BY 3.0:
  roupa/rosto definidos, diffuse/normal/specular, FBX walk/fury/dead.
  Blender não lê FBX 6100 e Assimp também recusou. Conversão offline com
  FBX2glTF v0.13.1 do projeto Godot foi testada e gerou GLB real.
- Rosswet Mobile, **Thin Zombie**, OpenGameArt
  `/content/thin-zombie-awake-zombie-asset`, CC-BY 3.0:
  Blender/textura 1024, ~3.340 tris, clips idle/walk/run/attack/hurt/dead.
  Candidato para silhueta agressiva já existente, sem criar comportamento.
- Braços CC0 para/MakeHuman: fonte anatômica existente pode ser reutilizada
  com nova pose, escala e detalhes, removendo a adaptação de vértices por caixa.
  NetSirK FPS Arms Pack CC-BY 4.0 e J-Toastie FPS Rig CC-BY 3.0 foram baixados
  para comparação, mas são mais simples; não adotá-los só por terem animação.
- A página/preview da Beretta 93r de Kristian M/Poly Pizza foi inspecionada e
  rejeitada como substituição principal: mais estilizada e outro equipamento.
  O modelo 3D dessa opção não foi baixado ou declarado integrado.

## Ordem e critérios

1. Converter a pistola texturizada; conferir UV, peças, medidas e silhueta.
2. Corrigir mão dominante/apoio com rig e dedos envolvendo o cabo, não o
   ferrolho; dimensionar palmas e vestir luvas/mangas sem esconder a arma.
3. Hip inferior lateral, ADS pelas miras e suporte 4:3/16:9/21:9, FOV 70–100;
   observar ReloadController e nunca animar regras de munição.
4. Integrar primeiro Pixelhouse com material, clips e cabeça/chão coerentes
   com volumes atuais; depois Rosswet/variantes. Não trocar hitboxes/atributos.
5. Decoração somente visual junto às paredes/teto, sem bloquear rotas/spawns;
   materiais/normal/roughness e sinalização legível, luz sem excesso de brilho.
6. npm ci/test/tsc/build/test:motion; regressão Rapier/combate/perks/rodadas;
   Chromium, screenshots comparáveis e perfil de 4/20 infectados.

Aceite depende de inspeção das imagens, arma visível, empunhadura coerente,
rosto/roupa com detalhe e identidade além de tintas, não apenas compilação.
Se um critério não for atingido, registrar como pendência e manter revisão
em rascunho. Não iniciar M8.2 nem publicar em produção.
