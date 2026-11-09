# Pipeline dos assets M8.1.2

Os arquivos finais em `public/assets/models/` já estão incluídos no repositório.
O jogo não executa conversores nem depende das bibliotecas de origem na internet.
Não é necessário preparar assets novamente para `npm ci/test/build`.

Fontes, licenças e hashes: `public/assets/manifests/sources-m812.json`,
`visual-assets-m812.json`, `toolchain-m812.json` e `ATTRIBUTION.md`.
Os três ZIPs de origem foram baixados e inspecionados. A fonte CC0 dos braços
é reutilizada do M8.1.1; não usar o GLB de braços antigo como fonte de conversão.

## Requisitos offline

- Blender 4.3.2, Python com Pillow.
- FBX2glTF 0.13.1 do Godot, obtido da release registrada em `toolchain-m812.json`.
  Extrair o ZIP e conferir o SHA256 antes de usar; os termos da ferramenta/FBX SDK
  acompanham a release. O binário não é redistribuído pelo jogo.
- Ferramentas Node separadas das dependências do runtime:

```sh
npm install --prefix /tmp/m812-assets --cache /tmp/m812-npm-cache meshoptimizer@1.3.0 gltf-validator@2.0.0-dev.3.10
```

Pillow e py7zr podem ser instalados numa virtualenv temporária para preparação;
py7zr só é necessário para extrair a fonte CC0 dos braços.

## Conversão recuperável

Executar na raiz do projeto. Os caminhos abaixo descrevem os diretórios usados
na validação; ajustar a localização dos executáveis se necessário.

```sh
python tools/fetch-m812-assets.py /tmp/m812-research
python tools/fetch-visual-assets.py /tmp/m811-research
ln -s /tmp/m811-research/arms /tmp/m812-research/arms
```

O último comando só é necessário se o diretório de braços ainda não existir.
Converter `walk.FBX`, `fury.FBX` e `dead.FBX` em
`pixel-walk.glb`, `pixel-attack.glb` e `pixel-dead.glb`:

```sh
/tmp/m812-fbx2gltf/FBX2glTF-linux-x86_64/FBX2glTF-linux-x86_64 -i /tmp/m812-research/zombie-pixelhouse/walk.FBX -o /tmp/m812-research/pixel-walk -b
/tmp/m812-fbx2gltf/FBX2glTF-linux-x86_64/FBX2glTF-linux-x86_64 -i /tmp/m812-research/zombie-pixelhouse/fury.FBX -o /tmp/m812-research/pixel-attack -b
/tmp/m812-fbx2gltf/FBX2glTF-linux-x86_64/FBX2glTF-linux-x86_64 -i /tmp/m812-research/zombie-pixelhouse/dead.FBX -o /tmp/m812-research/pixel-dead -b
blender -b -t 2 --disable-autoexec --python tools/prepare-m812-viewmodel.py -- /tmp/m812-research
blender -b -t 2 --disable-autoexec --python tools/prepare-m812-hunter.py -- /tmp/m812-research
python tools/prepare-m812-worker.py /tmp/m812-research
ASSET_TOOLS_NODE_PATH=/tmp/m812-assets/node_modules node tools/finish-m812-worker.cjs
```

FBX 6100 não é suportado pelo importador Blender nem pelo Assimp testados.
O worker preserva os binds originais do FBX2glTF. Um round trip desse esqueleto
pelo Blender produziu deformação e foi descartado; não substituí-lo pelo GLB
desse caminho sem nova validação. O conversor não achou nomes antigos das
texturas FBX; a etapa Python incorpora explicitamente os mapas reais do ZIP.

`prepare-m812-worker.py` escreve o GLB base. `finish-m812-worker.cjs` adiciona
LOD, vestuário skinnado, tangentes, orientação e elimina helpers/dados sem uso.
Executar os dois em sequência; a etapa finish não deve ser aplicada duas vezes
ao mesmo GLB já processado.

## Grounding e contratos

As curvas de compensação da morte foram medidas no próprio Three.js. Blender
não foi usado como referência final de bounds para o bind legado do worker.
O modo raw existe somente na fixture e não muda o gameplay do build normal:

```sh
node tools/build-visual-fixture.mjs
./node_modules/.bin/vite preview --host 0.0.0.0 --port 4175 --outDir /tmp/m811-visual-build
```

Com o preview rodando, executar em outro terminal, com Playwright disponível:

```sh
NODE_PATH=/tmp/protocol-browser/node_modules node tools/measure-m812-grounding.cjs
python tools/inventory-m812-assets.py
ASSET_TOOLS_NODE_PATH=/tmp/m812-assets/node_modules node tools/validate-m812-gltf.cjs
node tools/build-visual-fixture.mjs
NODE_PATH=/tmp/protocol-browser/node_modules node tools/validate-m812-browser.cjs
```

A medição usa `?rawGrounding=1`, 33 amostras por arquétipo, vértices deformados
das geometrias indexadas visíveis e uma envoltória conservadora com variação
máxima de 2 cm por amostra. Salva JSON com hashes dos GLBs e gera
`DeathGrounding.ts`. Recompilar a fixture após a medição para testar a correção.
Atualizar curvas e inventário sempre que os GLBs mudarem.

Revisar screenshots/contatos de dedos, clips, escala e chão além dos testes;
um GLB válido e um build aprovado não certificam qualidade de arte ou 60 FPS.
