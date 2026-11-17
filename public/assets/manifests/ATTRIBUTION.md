# Assets ativos — M8.1.2

## Beretta 92 texturizada / M9
“textured pistol”, por **Pixel32**. Fonte e licença verificadas na página:
https://opengameart.org/content/textured-pistol — **CC-BY 3.0**.
Original: https://opengameart.org/sites/default/files/pistol.zip
Arquivo integrado: `models/weapons/m9-service.glb`.
Adaptações: escala/eixos métricos, união por peças funcionais, PBR com UV/diffuse
originais, separação de slide/magazine/trigger/hammer e marcadores das miras.

## Infectado vestido / variantes Comum, Corredor e Brutamontes
“zombie”, por **Pixelhouse team**, **CC-BY 3.0**.
https://opengameart.org/content/zombie
https://opengameart.org/sites/default/files/zombie.zip
Crédito solicitado pelo autor: **Pixelhouse — http://www.pixelhouse.com.ar**.
Arquivo integrado: `models/characters/infected-worker.glb`.
Adaptações: conversão FBX 6100 com Godot FBX2glTF 0.13.1, combinação dos clips
Walk/Fury/Dead (nomes Walk/Attack/Death), Idle derivado, orientação/escala,
root motion planar removido, mapas originais convertidos para PBR/1024,
LOD com meshoptimizer e colete modelado a partir da superfície skinnada do torso.
O vestuário original é uma camiseta/calça danificada; não é uniforme militar
sob medida. Não foi extraído de outro jogo; é uma liberação do próprio autor.

## Predador
“Thin Zombie [ Awake Zombie Asset ]”, por **Rosswet Mobile**, **CC-BY 3.0**.
https://opengameart.org/content/thin-zombie-awake-zombie-asset
https://opengameart.org/sites/default/files/new_thin_zom.zip
Arquivo integrado: `models/characters/infected-hunter.glb`.
O próprio criador liberou o asset na biblioteca. Adaptações: Blender → GLB,
LOD, escala, root motion e nomenclatura dos clips; sem novas habilidades.
Clips originais idle/walk/run/attack1_l/hurt/dead1.

## Braços do operador
Fonte anatômica **para / MakeHuman team**, **CC0 1.0** (mesma fonte do M8.1.1):
https://opengameart.org/content/fps-arms-rigged-only
Arquivo integrado: `models/viewmodels/operator-arms.glb`.
Nova pose de punhos/dedos, escala de mão, metacarpo do indicador, painéis de
reforço ajustados ao mesh com skin, mangas/luvas PBR e SupportReload rebakeado.
Não são braços de outro jogo. Foram pesquisados outros rigs disponíveis,
mas fontes mais simples não foram apresentadas como melhoria de anatomia.

Licenças oficiais: https://creativecommons.org/licenses/by/3.0/
e https://creativecommons.org/publicdomain/zero/1.0/.
Cópias locais: `CC-BY-3.0.txt`, `CC0-1.0.txt`.
Texturas/painéis de luva, colete e sinalização originais do projeto: CC0.
Inventário ativo: `visual-assets-m812.json`. Downloads/hashes: `sources-m812.json`.
Os modelos estão integrados para revisão; não são declarados arte final aprovada.

---

## Créditos históricos M8.1.1 (arquivos preservados, fora do carregamento ativo)

# Créditos de modelos 3D — PROTOCOL: DEAD ZONE

## Pistola 9mm / M9
“9mm Pistol” / “9mmBeretta”, por **Quaternius**.
Fonte: https://poly.pizza/m/BoZWhFdsj4
Licença da página de download: **Creative Commons Attribution 3.0**:
https://creativecommons.org/licenses/by/3.0/
Cópia local: CC-BY-3.0.txt.

Adaptações do projeto: escala/eixo, UVs, materiais/texturas PBR,
bevels leves e carregador móvel original adicionado. Geometria original preservada.
A integração não é uma reprodução técnica certificada da arma real.

## Infectado
“Animated Zombie”, por **Quaternius**.
Fonte: https://poly.pizza/m/jkrEvQZb8J
Licença da página de download: **Creative Commons Attribution 3.0**:
https://creativecommons.org/licenses/by/3.0/
Cópia local: CC-BY-3.0.txt.

Adaptações: escala/cores/retarget visual, LOD derivado, remoção de root motion
horizontal em runtime. Clips originais Idle/Walk/Run/Bite/Crawl.
Reação ao tiro é procedural; o colapso de morte adapta e congela uma pose
do clip Crawl. Não é uma animação de morte fornecida pelo autor e não cria IA
de rastejamento. Nenhuma habilidade foi adicionada.

## Braços FPS
“fps arms (rigged only)”, por **para**, mesh e textura de origem **MakeHuman team**.
Fonte: https://opengameart.org/content/fps-arms-rigged-only
Licença: **CC0 1.0**:
https://creativecommons.org/publicdomain/zero/1.0/
Cópia local: CC0-1.0.txt.

Adaptações: pose de empunhadura e dedos, materiais de luva/manga, escala,
conversão Blender → GLB, bake de esqueleto e clip de mão de apoio na recarga.
A textura de pele original não é usada na adaptação com luvas.
As texturas de tecido/metal e o carregador acrescentado foram gerados
originalmente para este projeto e disponibilizados em CC0.

Todos os arquivos essenciais são locais. Modelos/adaptações permanecem
provisórios para aceite de direção de arte; não são declarados arte AAA/final.
Nenhum modelo foi extraído de outro jogo.
