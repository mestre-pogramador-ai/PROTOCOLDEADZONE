# M6.1 — Validação e evidências

## Verificações executadas no ambiente de criação

- `npm run test:motion`: **13/13 PASS**. Compila e executa verificações puras de
  movimento horizontal/diagonal, yaw, controle do salto, gravidade, velocidade terminal
  e interpolação — sem depender de npm online nem de Rapier.
- Verificação sintática de todos os TS/TSX via API TypeScript: consulte o registro
  da execução na entrega. Uma verificação sintática **não** substitui o build tipado.
- ZIP final conferido via `ZipFile.testzip()`.

## Testes incluídos mas não executados aqui

- `src/tests/M61Movement.test.ts`: 4 testes matemáticos + 6 testes que criam uma
  instância real do mundo Rapier após o `RAPIER.init()`, movimentando a cápsula contra
  parede, corredor, chão e testando salto, repouso e deslizamento. Rodar com `npm test`.
- `npm run build`: verificação TypeScript completa, renderização/Vite, empacotamento.
- Testes no navegador com WebGL 2 e Pointer Lock.

O ambiente não resolve `registry.npmjs.org` (DNS), portanto não foi possível instalar
as dependências para executar Vitest, o build completo ou verificar o browser.
Não interpretar "escritos" como "aprovados" nos testes de integração.

## Comandos

```bash
npm install
npm run test:motion
npm test
npm run build
npm run dev
```

Se ocorrer erro de tipo, importação, WASM ou navegação, copie o log completo.
Para depurar eventual recuo residual: inicie com `?debugMovement=1`, grave o instante
em que acontece, observe valores "passo solicitado/permitido" e o contador de contatos,
e informe se acontece em área livre ou junto a um prop/parede.
