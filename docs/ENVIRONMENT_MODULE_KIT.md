# Kit visual de ambiente — M8.1.4

O kit contém dados de apresentação e criação de recursos Three.js. Não importa
Runtime, Rapier, economia, navegação ou o mapa da Sala de Contenção. A interface
`Vec3` é local e estruturalmente compatível com os vetores do mapa.

## Peças e composição

`EnvironmentModuleKit.ts` exporta:

| API | Contrato |
|---|---|
| `createStructuralParts(spec, options)` | Piso, parede, teto ou moldura; posição central e dimensões em metros. `wallAxis` e `faceSign` escolhem a face interna. |
| `createIndustrialProp(id, kind, size, position, yaw)` | Pod, console, armário, caixa, estação ou máquina. Posição é o centro do volume; base calculada por `Y-altura/2`. Yaw em radianos. |
| `createSecurityDoorParts(id, size)` | Peças locais à origem central da porta; mecanismo e preço pertencem ao Runtime existente. |
| `createLuminaire(anchor, position)` | Carcaça e emissivo; não cria automaticamente luz dinâmica. |
| `createConduit(id, anchor, position, length, axis)` | Conduto em X/Z, oito lados, sem collider próprio. |
| `createPanel(anchor, tile, position, size, rotation)` | Sinalização do atlas, com UV/padding compartilhados. |
| `placeVisualParts(parts, position, yaw)` | Reposiciona/rotaciona uma composição sem duplicar sua construção. |
| `partBuilder(anchor, shadow)` | Composição de peças adicionais nos mesmos materiais e tipos. |

`EnvironmentLayout.ts` é o adaptador específico do mapa atual: identifica os
papéis dos objetos, escolhe suas posições e acrescenta storytelling local.
O snapshot `src/tests/fixtures/m813-visual-parts.json` preserva todas as 348
peças anteriores; IDs internos podem mudar, mas forma, posição, dimensão,
superfície e shadow flags são comparados a 1 micrômetro.

Exemplo de API, **não instanciado como outro setor**:

```ts
const wall = createStructuralParts({
  id: 'example-wall', kind: 'wall',
  position: [0, 1.75, -4], size: [8, 3.5, .35],
}, {wallAxis: 'x', faceSign: 1});
```

Paredes/tetos podem ajustar comprimento/altura; props industriais usam a
linguagem e as proporções dos equipamentos atuais. Tamanhos muito diferentes
exigem revisar seus envelopes antes de usar em gameplay. O kit não inventa
colisores, passagens ou spawn points. O mapa continua sendo a autoridade física.

## Materiais, luzes e descarte

`createRoomSurfaces(overrides?)` cria os materiais compartilhados e aceita
`EnvironmentSignage`: nome da sala, subtítulo, nome da porta, área no piso e
circuito elétrico. Os valores padrão mantêm B-01. Em React, `useRoomSurfaces`
aceita as mesmas opções; mantenha o objeto de configuração estável entre renders.

Quatro mapas de albedo 512² e um atlas 1024². Para piso/pintura, roughness
linear é armazenado no alfa do albedo sRGB e lido do mesmo texel; RGB continua
albedo. Isso só é válido para materiais Standard opacos, sem alpha-test e com
opacity 1. O shader mantém o PBR padrão; nenhuma conversão para Lambert/unlit.
A transparência dos pods e todos os materiais dos personagens são preservados.

`EnvironmentLights` recebe `EnvironmentLightRig`. A configuração da sala mantém
ambiente/hemisfério, uma direcional com sombra 1024 e duas pontuais sem sombra.
Luminárias emissivas são independentes do número de luzes dinâmicas.

`buildEnvironmentBatches(parts, partition?)` compartilha buffers por material,
sombra e região definida pelo chamador. A implementação atual separa sala e
corredor. Cada mesh conserva frustum culling normal da câmera e da sombra;
não há ocultação arbitrária por porta ou desativação de geometria necessária.
`mergeVertices` usa tolerância 1e-6 m e índices, preservando todos os triângulos,
normais e UVs. O chamador deve executar `disposeEnvironmentBatches` no unmount.
Materiais/texturas são liberados pelo hook/factory, compartilhados entre batches.

## Bounds dos infectados

`CharacterCulling.ts` usa envelopes locais de todas as animações existentes,
33 amostras por clip mais margem de 0,65 m para retarget/impacto. SHA-256 liga os
dados aos GLBs atuais. Cada SkinnedMesh recebe uma esfera própria; Three avalia
a câmera e a câmera de sombra independentemente. Não altera LOD, clip, textura,
IA, hitbox ou atualização da animação fora da tela. Mesh desconhecido ou hash
incompatível mantém o culling desativado para evitar desaparecimento.

Ao trocar um modelo/animação, atualizar o inventário/licença e executar:

```sh
node tools/measure-m814-culling.mjs
npm test
npx tsc -b
npm run build
```

Os testes amostram outros instantes, escalas das variantes, retarget e skeleton
compartilhado. O ensaio Chromium compara culling ligado/desligado com os mesmos
atores fora da câmera; screenshots devem continuar iguais. Esses bounds não
substituem validação de novos assets/poses ou a configuração dos colliders.

## Próxima etapa

Nenhum setor novo foi criado. A base permite compor outro ambiente com o mesmo
kit após revisão, integração dos PRs e validação de desempenho em GPU real.
Amostras SwiftShader são diagnósticas; não homologam a meta desktop de 60 FPS.
