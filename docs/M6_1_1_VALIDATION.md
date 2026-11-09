# M6.1.1 — Correções e validação

Data: 08/11/2026. Base analisada: main, commit 01cba956.
Escopo: validar M6.1 e corrigir sua infraestrutura de testes; M7 não iniciado.

## Preparação

O checkout inicial estava no commit 63c29f4, contendo somente README.
Foi atualizado por fast-forward para origin/main, sem alterações locais existentes.
Ambiente: Node 24.22.1, npm 11.9.0. Dependências instaladas pelo lockfile,
sem atualizar versões: 124 pacotes.

A primeira instalação falhou por acesso ao cache padrão
(/home/agent/.npm/_cacache, ENOENT). A repetição com cache gravável funcionou:

```sh
npm ci --cache /tmp/protocol-npm-cache
npm run test:motion
npm test
npm run build
```

## Problemas encontrados e corrigidos

1. **Rapier impedia coletar toda a suíte M61Movement.**
   Erro original: "exports is not defined in ES module scope".
   O pacote 0.17.3 declara type:module, mas aponta main para rapier.cjs.js.
   Node/Vitest selecionava essa entrada; Vite no navegador seleciona module.
   Configurado alias exclusivo dos testes para rapier.es.js, o bundle ESM do
   mesmo pacote instalado. Não há mock, troca de versão nem edição de node_modules.
   Apenas inline da dependência não resolveu (erro de propriedade init somente leitura);
   essa tentativa não faz parte da configuração final.
   Os testes agora inicializam WASM real e exercitam o KCC.

2. **Expectativa incorreta no teste de hitscan da parede oeste.**
   O raio em z=0 encontra power-cabinet antes da parede, corretamente.
   Ajustado o cenário da parede para uma trajetória livre em z=2 e acrescentado
   teste explícito para a oclusão pelo armário. Mapa, hitscan e combate preservados.

3. **Falha WASM ao iniciar a partida em React StrictMode.**
   O smoke interativo revelou "memory access out of bounds" seguido de
   "recursive use of an object detected". Duas chamadas concorrentes a
   Runtime.create() reinicializavam o módulo Rapier. A inicialização agora
   compartilha uma única Promise, com possibilidade de nova tentativa após rejeição.
   Mantidos StrictMode e descarte dos runtimes cancelados. Acrescentado teste
   de criação concorrente, descarte de uma instância e acesso independente à outra.
   Repetido smoke com início de partida, W e Espaço: nenhum pageerror.

Não foram encontrados erros de compilação ou TypeScript: o build tipado passou
antes e depois das correções. A correção de runtime se limita à inicialização WASM; preservados os
sistemas de arma, inimigos, rodadas, economia, áudio, persistência ou UI.

## Resultados automatizados

- npm run test:motion: **13/13 verificações aprovadas**.
- npm test: **14 arquivos, 65 testes aprovados**.
- Integração Rapier: seis cenários reais aprovados — repouso no piso,
  bloqueio na parede, deslizamento, salto/retorno ao chão, abertura da porta,
  parada após colisão e sincronização da interpolação.
- npm run build: **aprovado**, tsc -b e Vite 6.4.5; 81 módulos.
- Smoke inicial no Chromium headless com WebGL via SwiftShader:
  menu carregado, canvas criado, partida iniciada, W e Espaço enviados e nenhum pageerror.

## Avisos e limites

- Vite avisa sobre chunk superior a 500 kB: JS de aproximadamente 3.567 kB,
  gzip 1.217 kB, incluindo Rapier compat/WASM. É aviso, não falha.
  Divisão de bundle fica como otimização futura.
- Rapier 0.17.3 emite aviso interno de parâmetros de inicialização obsoletos.
  Sua API pública tipada continua init(): Promise<void>; os chamadores já a
  utilizam corretamente. Não foi suprimido o aviso nem alterada a dependência.
- Smoke automatizado não comprova ausência visual de recuo, qualidade do áudio
  ou desempenho a 60 FPS. O roteiro manual de M6_1_MOVEMENT_STABILITY.md,
  incluindo sessão prolongada, Pointer Lock, pausas e 1/3/6 infectados,
  continua necessário para aceite visual completo.

M6.1.1 validado no escopo automatizado. Aceite visual completo permanece pendente.
Não houve publicação, push ou avanço para M7.
