# M7.1 — Reposição de munição, economia e validação

Data: 09/11/2026 (America/Sao_Paulo). Versão: 0.8.1.
**Resultado: critério automatizado de progressão econômica até R10 atendido.**
M8 não iniciado. Aceite humano de sobrevivência continua pendente.

## Base e commits utilizados

- main remota conferida antes das alterações: **65de3b3** (M7 integrado).
- Relatório consultado: docs/M7_TEST_REPORT.md, vindo do PR #4.
  Como ainda não estava em main, seu teste/relatório foram trazidos para esta
  branch pelo commit 7d33470, sem alteração de gameplay.
- Implementação: **c08de50** — estação, transações, socorro e integração.
- Regressão e progressão real de disparos: **e342e7e**.
- Metadados v0.8.1, favicon, evidências e este relatório são o commit de entrega
  posterior. Não houve atualização das versões das dependências.

## Funcionalidades implementadas

- Estação física na Contenção, posição X=-2,5/Z=-1,5, próxima ao ponto inicial;
  bloco e sinal verde, colisão compartilhada com navegação/hitscan.
- Tecla E escolhe a interação pela proximidade; porta e sua compra preservadas.
- Pacote M9: **30 balas por 180 CR**. Reserva máxima **90**, carregador máximo
  **15**; capacidade total permanece **105**.
- Se faltar menos de 30 na reserva, cobra apenas **6 CR por bala entregue**.
  Reserva cheia não cobra. Comprar não recarrega o carregador: R continua necessário.
- AmmoSupply coordena débito síncrono pelo EconomyManager e entrega pelo M9Controller.
  IDs de requisição e recibos bloqueiam repetição de entrega/cobrança, inclusive
  em outra instância do serviço com o mesmo recibo. Debounce de 0,25 s evita
  compras acidentais imediatas; keydown repetido mantém o comportamento de borda.
- Sem saldo suficiente e ainda com alguma bala: compra negada sem débito.
- Sem **nenhuma** bala e sem saldo para o pacote: **15 balas de socorro**, na estação.
  Uma nova concessão exige **30 segundos de simulação**. Não cria créditos,
  não cura, não recarrega automaticamente e não protege de ataques.
- Pausa congela a espera. Reinício limpa recibos/temporizadores e restaura
  500 CR, 15/90, R1, inimigos e porta.
- HUD sincronizado no evento confirmado de compra; feedback textual e cue sonoro
  de compra/negação existentes. Diagnóstico registra resultado, quantidade e custo.
- Resolução de hitscan/dano/recompensas compartilhada com o Runtime via ResolveShot,
  preservando multiplicador de headshot, pagamentos e eventos do combate anterior.

## Justificativa de balanceamento

Não alteramos quotas, HP, dano da M9 (32/64), cadência, recarga, recompensas ou
preço da porta. O bloqueio era a inexistência de reposição.

Cada bala custa 6 CR; hit confirmado paga 10 CR até cinco por inimigo,
eliminação corporal paga 60 e headshot 90, mais bônus da rodada.
Na R10, um Brutamontes tem 342 HP e exige 11 acertos corporais.
Com 67% de acerto, o consumo médio é cerca de 16,5 balas (99 CR), contra
110 CR de receita por cinco hits pagos + eliminação corporal, sem incluir bônus.
Isso preserva uma margem econômica mesmo para o alvo mais resistente até R10,
sem reduzir o perigo físico ou aumentar a capacidade carregada.

O socorro reduz o risco de bloqueio definitivo: somente vazio e pobre,
apenas na estação, 15 balas e 30 s entre entregas. A cadência de suprimento
(0,5 bala/s) é muito inferior ao fogo máximo (6 tiros/s). Esperar sob pressão
continua perigoso. Não foi usado nenhum socorro nas provas normais de progressão.

## Comandos executados e resultados

Ambiente: Node 24.22.1, npm 11.9.0; Chromium headless/SwiftShader.

| Comando/verificação | Resultado final |
| --- | --- |
| npm ci --cache /tmp/protocol-npm-cache | 124 pacotes instalados |
| npm test | **119 aprovados, 0 reprovados, 20 arquivos** |
| npx tsc -b | aprovado, sem erros |
| npm run build | aprovado; 85 módulos; JS 3.576,67 kB / gzip 1.220,35 kB |
| npm run test:motion | **13 verificações aprovadas** |
| Integração real Rapier/KCC | aprovada nas suítes M6.1/M6.2/M7/runtime |
| git diff --check | sem erros |
| Chromium contra build de produção local | aprovado; **0 erros de console/pageerror e 0 erros HTTP** |

Logs completos em [docs/validation/M71](docs/validation/M71).
O aviso de chunk >500 kB continua no build; Rapier mantém seu aviso interno
de init obsoleto. Não foram ocultados.

Para repetir o navegador, iniciar npm run preview -- --port 4173 e executar:

```sh
# Playwright deve estar instalado; nesta sessão está em /tmp/protocol-browser.
NODE_PATH=/tmp/protocol-browser/node_modules node tools/validate-m71-browser.cjs
```

O script usa /usr/bin/chromium por padrão. CHROMIUM_PATH, M71_URL e
M71_EVIDENCE_DIR permitem configurar binário, URL e diretório de evidência.

## Testes adicionais

M71Ammo (9 testes): reserva cheia, complemento parcial, teto, recibos repetidos,
cooldown, requisição inválida, saldo insuficiente, socorro condicionado,
reposição durante recarga, preparação, pausa, reset e recibo compartilhado.

M71Progression (3 cenários): headshots sem erro, 80% de acertos corporais,
67% de acertos corporais. Usam M9Controller para cada bala/cooldown/recarga,
ResolveShot/hitscan para dano real, EnemyManager para HP/estado,
EconomyManager para recompensas/pagamentos e RoundDirector para R1–R10.
A porta de 750 CR também é comprada nesses cenários. Crédito e munição
são conservados; não há concessão direta de balas ou créditos.

M71RuntimeProgression (1 teste): percorre o **Runtime real**, com GameClock,
Rapier do jogador, input de disparo/recarregar/interagir, hitscan/dano,
recompensas, compras, métricas e composição das dez rodadas.
Obtém 187 eliminações com **1.271 disparos**, **1.017 acertos corporais**,
254 erros, 80% de precisão, 7.200 CR gastos em munição e saldo final 14.160 CR.

Nenhuma dessas novas provas chama applyDamage para eliminar alvos diretamente:
a chamada de dano existe apenas no resolvedor de combate de produção, após
um disparo real consumir uma bala e acertar o hitscan.

### O que foi simulado

Para tornar os testes determinísticos, usamos uma linha de tiro com um alvo vivo
por vez. Spawn/posição, mira e gatilho são controlados. No teste do Runtime,
a navegação/ataques da IA são substituídos para manter alvos imóveis; o jogador
permanece ao alcance da estação. A taxa de erros é programada.

Portanto, validamos **progressão econômica e integração de combate com recursos
finitos**, não uma partida humana completa contra hordas. Os testes existentes
de IA, ataque, colisão e multidões continuam executados separadamente.
O teste antigo M7RuntimeValidation ainda elimina pela API como regressão de
orquestração; ele **não é usado** como evidência de progressão econômica do M7.1.

## Evidência da progressão finita

Valores medidos, incluindo a porta nos três cenários de componentes:

| Cenário | Rodadas | Eliminações | Disparos | Erros | Compras | Balas compradas | Recargas | Saldo final |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Headshots 100% | 10 | 187 | 542 | 0 | 16 | 480 | 36 | 20.080 CR |
| Corpo 80% | 10 | 187 | 1.271 | 254 | 40 | 1.200 | 84 | 13.410 CR |
| Corpo 67% | 10 | 187 | 1.525 | 508 | 49 | 1.470 | 101 | 11.790 CR |

Detalhe do cenário corporal a 80% (valores acumulados):

| R | Infectados | HP base | Disparos | Compras | Saldo |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 8 | 100 | 39 | 0 | 610 |
| 2 | 10 | 109 | 89 | 1 | 1.500 |
| 3 | 12 | 118 | 149 | 3 | 2.420 |
| 4 | 15 | 126 | 219 | 5 | 3.610 |
| 5 | 17 | 135 | 313 | 8 | 4.940 |
| 6 | 20 | 146 | 432 | 12 | 6.480 |
| 7 | 22 | 157 | 584 | 17 | 8.080 |
| 8 | 25 | 168 | 787 | 24 | 9.660 |
| 9 | 28 | 179 | 1.018 | 32 | 11.400 |
| 10 | 30 | 190 | 1.271 | 40 | 13.410 |

Multiplicadores de HP por variante permanecem os do M7.
A porta é comprada quando o saldo alcança 1.000 CR, mantendo uma reserva;
o teste não afirma que gastar todo o saldo em qualquer ordem é equivalente.
Em cada tick: saldo = 500 + ganhos - gastos, saldo >= 0.
Ao final: disparos + balas restantes = 105 + balas compradas.
Dados reproduzíveis: [progression.json](docs/validation/M71/progression.json).

## Navegador — resultados e evidências

Build servido por vite preview em localhost:4173, sem injetar estado de gameplay:

1. Início, aterrissagem e HUD 15/90.
2. Disparo → 14/90; recarga real → 15/89.
3. E na preparação → 15/90 e saldo **500 → 494**; mensagem de compra.
4. E com reserva cheia → nenhuma nova cobrança.
5. T → R1 ativa e oito infectados previstos.
6. Pausa, retomada e reinício → preparação R1, 15/90 e 500 CR.
7. F8/F9 e BAIXAR ERROS → JSON M7.1 com marca, sem dados privados.

[Resultado/console](docs/validation/M71/browser.json),
[relatório exportado](docs/validation/M71/diagnostics.json),
[compra](docs/validation/M71/purchase.png),
[rodada ativa](docs/validation/M71/round-active.png).

Foi verificado por bounding boxes que o botão de diagnóstico não encobre
os créditos. Esse teste valida o build local, não um deploy Vercel/Netlify.
Áudio teve seus eventos preservados; não declaramos qualidade auditiva aprovada.

## Problemas encontrados e corrigidos

- **Bloqueio por falta de balas:** reposição paga + socorro, com prova finita até R10.
- **Cobrança/entrega repetida:** ID e recibo, débito/entrega síncronos, debounce.
- **HUD atrasado após compra:** atualização no evento confirmado, sem esperar polling.
- **Interferência da primeira posição da estação nas simulações de IA:**
  seis testes iniciais reprovaram porque a estação ocupava a área de spawn da fixture.
  Reposicionada para X=-2,5/Z=-1,5; as regressões originais voltaram a passar.
- **Favicon ausente:** o smoke inicial registrou 404; adicionado favicon, nova execução
  sem erro HTTP/console. Título da página atualizado de M6 para M7.1.
- **Botão BAIXAR ERROS sobre os créditos:** detectado ao inspecionar screenshot;
  reposicionado e adicionada verificação de não sobreposição no script.
- **Painel de diagnóstico sobre informações de rodada:** movido para região central
  lateral; continua opcional via debugMovement=1.

## Pendências e recomendação sobre M8

O bloqueio econômico de R1–R10 está resolvido **nos testes automatizados**.
Recomendo preparar M8 após revisão/integração desta branch, mantendo como aceite
manual uma partida real para avaliar alcançar a estação sob pressão, custo/risco,
reconhecimento visual, áudio e sensação de dificuldade.

Não garantimos sobrevivência humana até R10, 60 FPS em GPU real ou ausência de
vazamentos em sessões longas. Permanecem navegação 2D, separação quadrática,
possíveis congestionamentos, cápsula de agachamento inalterada e avisos Rapier/bundle.
Saldo final alto reflete recompensas do M5 preservadas; eventual redução exige
playtest próprio, não foi aplicada arbitrariamente nesta correção.

Nenhum código de M8 foi iniciado; não houve merge em main nem publicação do ambiente.
