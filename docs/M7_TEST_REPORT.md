# M7 — Relatório de teste após integração em main

Data: 09/11/2026 (America/Sao_Paulo).
Base confirmada no GitHub: main e checkout em 65de3b3, v0.8.0.
Ambiente: Node 24.22.1, npm 11.9.0, Chromium headless com SwiftShader.
Resultado: **verificações técnicas aprovadas; progressão normal bloqueada pela munição**.

## Resultado executado nesta revisão

| Verificação | Resultado |
| --- | --- |
| Suíte completa, incluindo novo teste de runtime | 106/106 testes, 17 arquivos aprovados |
| Verificações matemáticas de movimento | 13/13 aprovadas |
| TypeScript e build Vite | aprovados |
| git diff --check | sem erros |
| Chromium contra build de produção local (vite preview) | sem pageerror |
| Disparo, recarga e retomada | 15/90 → 14/90 → 15/89 |
| F8/F9 e botão BAIXAR ERROS | JSON exportado, versão M7 e marca presentes |

Comandos executados:

```sh
npm test
npm run build
npm run test:motion
npm run preview -- --port 4173
```

A automação de navegador acessou localhost:4173, iniciou a operação,
disparou, recarregou, pausou/retomou, moveu, saltou, marcou F8, exportou F9
e também exportou pelo botão na pausa. As esperas verificaram o estado do HUD,
que é atualizado por amostragem, em vez de assumir atualização instantânea.

Evidência resumida do navegador e cálculo de munição:
[JSON da execução](validation/M7_BROWSER_AUDIT.json).
O cálculo de munição leu os módulos TypeScript pelo servidor Vite local;
o smoke de gameplay utilizou os assets do build. Não foi testado um domínio Vercel.

## Cobertura do M7

Os 20 testes anteriores de M7 foram repetidos:
limiares R4/R7/R10, composição até R30, HP por tipo, retries,
velocidade e cadência individuais, um impacto por golpe, morte, obstáculos,
headshots, 20 infectados mistos por 20 segundos simulados e pausa/reset.

Adicionado M7RuntimeValidation.test.ts:
Runtime real, Rapier/KCC, SpawnDirector e RoundDirector avançam juntos até
concluir R10; verifica tipo e HP de cada spawn, quotas, IDs, posição finita,
quatro variantes presentes, saúde e reset completo para R1 e M9 15/90.

**Limite importante:** nesse teste adicional, os inimigos são eliminados pela
API de teste assim que nascem. Isso valida integração e progressão de estados,
não capacidade de sobreviver ou de pagar o custo de munição numa partida real.
Não foi simulada uma partida humana com mira perfeita até R10.

## Problema de gameplay confirmado: munição insuficiente

A M9 começa com 15 no carregador e 90 na reserva: **105 balas no total**.
Não há reposição de munição na versão atual.

Calculamos o limite inferior de disparos por inimigo usando
ceil(HP / (32 × 2)), ou seja, todos os tiros acertam a cabeça e não há erros.
Somamos todos os inimigos previstos, com seus multiplicadores de HP e quotas.

| Rodada concluída | Infectados na rodada | Headshots mínimos na rodada | Total acumulado |
| --- | ---: | ---: | ---: |
| R1 | 8 | 16 | 16 |
| R2 | 10 | 20 | 36 |
| R3 | 12 | 24 | 60 |
| R4 | 15 | 30 | 90 |
| R5 | 17 | 46 | **136** |
| R6 | 20 | 55 | 191 |
| R7 | 22 | 70 | 261 |
| R8 | 25 | 81 | 342 |
| R9 | 28 | 95 | 437 |
| R10 | 30 | 105 | **542** |

Assim, a munição inicial **não permite concluir R5**, mesmo com precisão perfeita.
O Brutamontes da R7 e o Predador da R10 não são alcançáveis numa partida normal
apenas com os recursos atuais. A limitação já era conhecida em termos gerais;
esta revisão a quantifica e confirma como bloqueio de progressão.

Não alteramos dano, vida, economia nem munição durante uma tarefa de validação.
Recomendação para o próximo trabalho: resolver reposição de munição com custo,
limites e testes de transações, antes de ampliar o conteúdo ou declarar o M7
aceito como experiência completa.

## Avisos e pendências

- Bundle >500 kB: aproximadamente 3,57 MB de JS antes de gzip, incluindo WASM.
- Rapier ainda emite aviso interno de parâmetros de init obsoletos.
  A API pública tipada init() continua sendo a usada.
- Sem medição de FPS/GPU real ou perfil de memória em sessão longa.
- Áudio, sensação de combate, legibilidade visual e dificuldade dependem de
  aceite manual. As verificações de dano/headshot/IA são automatizadas.
- Agachamento ainda não reduz a cápsula; navegação é 2D e pode congestionar gargalos.
- O relatório comprova a build local da base integrada; não comprova deploy externo.

## Decisão

M7 está aprovado no escopo de compilação, regressão e integração automatizada.
Aceite de progressão jogável fica **pendente de reposição de munição** e teste manual.
Nenhum trabalho de M8 foi iniciado nesta revisão. Sem alteração de gameplay,
merge em main ou publicação do ambiente.
