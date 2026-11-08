# M6 — Registro de validação (7 nov. 2026)

Projeto derivado de `protocol-dead-zone-M5.zip`; arquivos de M0–M5 preservados.

## Executado neste ambiente

- Verificação semântica TypeScript isolada (`tsc --strict --noEmit`) dos módulos do
  domínio e serviços independentes de bibliotecas externas: **passou**.
- Compilação TypeScript isolada de 17 módulos de domínio e infraestrutura: **passou**.
- Runner independente com `node:assert/strict` para métricas, armazenamento,
  configurações, encerramento de clock dentro do tick, AudioDirector sem contexto,
  economia e início de rodada: **10 verificações passaram**.
- Análise sintática por `typescript.transpileModule` dos 43 arquivos TS/TSX em `src`:
  **nenhum erro de sintaxe detectado**. Isso não comprova tipagem de React/R3F.

## Não executado

- `npm install`/`npm test` (Vitest)/`npm run build` (TypeScript + Vite) **não concluídos**:
  o ambiente não consegue resolver `registry.npmjs.org` (falha de DNS).
- Jogo em navegador/WebGL/áudio real: **não testado neste ambiente**.
- Desempenho de 60 FPS: **não medido**.

## Como validar após descompactar

```bash
npm install
npm test
npm run build
npm run dev
```

Faça também o roteiro de 12 passos em `docs/M6_VERTICAL_SLICE.md` e, em caso de
falha de compilação ou runtime, envie a saída do terminal/console para correção.
