# PROTOCOL: DEAD ZONE

**M8.1.4-A — Horror Audio System + Desktop Test Build** · versão de pacote **0.9.5** · FPS 3D de sobrevivência para navegador e Windows x64, em desenvolvimento.

Este projeto preserva os sistemas M0–M8.1.4 e adiciona áudio local, vozes espaciais e música dinâmica. A primeira arena inclui:
menu, partida, preparação, rodadas, infectados, combate M9, créditos, porta comprável,
pausa, derrota, relatório e reinício. **Não é o jogo final nem uma demo comercial.**

## Requisitos

- Node.js 20.19+ ou 22.12+ e npm
- Navegador desktop com WebGL 2 (Chrome/Edge recomendados)
- Dispositivo de áudio opcional (AudioContext habilitado após clique do jogador)

## Instalação

```bash
npm ci
npm run dev
```

Abra a URL local informada pelo Vite. Para testes e compilação:

```bash
npm run test:motion
npm test
npx tsc -b
npm run build
npm run preview
```

## Controles

| Tecla | Ação |
| --- | --- |
| WASD / setas | Andar |
| Mouse | Olhar |
| Clique esquerdo | Atirar com M9 |
| Clique direito | Mirar (ADS) |
| R | Recarregar |
| Shift | Correr |
| Ctrl / C | Agachar |
| Espaço | Pular |
| E | Interagir com munição, porta ou máquina de perk próxima |
| T | Começar a próxima onda antes do fim da preparação |
| Esc | Pausar e liberar o mouse |
| F11 | Alternar tela cheia no Electron |
| F8 | Marcar um problema no diagnóstico |
| F9 / BAIXAR ERROS | Exportar relatório JSON |

## Funcionalidades atuais

- Simulação central de 60 Hz com física Rapier manual e uma única ponte R3F.
- **M6.1:** cápsula cinemática controlada pelo KCC Rapier; deslizamento em paredes,
  detecção de chão por contatos, autostep, snap-to-ground e câmera interpolada.
- Quatro arquétipos de infectados com perseguição, separação, preparação do ataque, dano e morte.
- Rodadas escaláveis, sistema de créditos com transações idempotentes, porta comprável.
- Menus e HUD integrados ao viewport, com opção de tela cheia.
- Configurações locais: volumes de áudio, mute, FOV, mouse, redução de movimento.
- 33 WAVs locais com fontes/licenças registradas, vozes 3D, música dinâmica e volume musical persistente.
- Munição comprável, socorro limitado e quatro perks de sessão.
- Sala de Contenção com GLBs, materiais PBR, iluminação e batches otimizados.
- Electron com arquivos locais, isolamento de contexto, sandbox e renderer sem Node.
- Relatório da operação com estatísticas e recorde local simples.

Para diagnosticar contato e deslocamento use `?debugMovement=1` na URL do jogo.
Leia `docs/M6_1_MOVEMENT_STABILITY.md` e `docs/M6_1_VALIDATION.md`.

A primeira rodada começa após 30 segundos de preparação; pressione **T** para começar agora.
A derrota encerra a partida; **REINICIAR OPERAÇÃO** limpa todos os recursos temporários.
O recorde salvo neste navegador permanece.

## Estrutura

- `src/app`: runtime e bootstrap
- `src/core`: relógio, eventos, input e ciclo de vida
- `src/gameplay`: jogador, M9, combate, IA, rodadas, economia e métricas de sessão
- `src/physics` e `src/world`: Rapier, colisões e mapa autoral
- `src/presentation`: renderização R3F, HUD/menus e áudio Web Audio
- `src/infrastructure/persistence`: preferências e melhor partida local
- `src/tests`: testes Vitest acumulados de todos os marcos
- `docs/M6_VERTICAL_SLICE.md`: escopo, limitações e checklist manual

**Limitações:** modelos, animações e mixagem continuam em revisão artística. Parte do áudio é de bibliotecas adaptadas e parte é DSP original; isso não constitui aprovação auditiva profissional. Não há novos setores nesta entrega, armas alternativas, missão final, progressão meta, multiplayer ou extração.
Leia `docs/M6_VERTICAL_SLICE.md` para mais detalhes.

## M6.2 — estabilidade, combate e IA

Correções e evidências: [relatório M6.2](docs/M6_2_VALIDATION.md).
Diagnóstico: **F8** marca um problema; **F9** ou **BAIXAR ERROS** exporta
um relatório local de eventos e amostras da simulação, sem dados privados.
Execute `npm test`, `npm run test:motion` e `npm run build` para validar.
O aceite visual em hardware real e o agachamento com redução física da cápsula
continuam pendentes do M6.2.


## M7 — Variantes de infectados

R1–3 mantêm o Infectado Comum. A partir da **R4**, surgem Corredores
(ágeis e frágeis); na **R7**, Brutamontes (lentos e resistentes);
na **R10**, Predadores (rápidos, com dano maior).
O HUD identifica tipos vivos e o início das rodadas de desbloqueio anuncia a ameaça.

Escopo, atributos, testes executados e aceite manual pendente:
[relatório M7](docs/M7_INFECTED_VARIANTS.md).

Validação após integração: [relatório de teste M7](docs/M7_TEST_REPORT.md).
A falta de reposição identificada no M7 é tratada no M7.1.


## M7.1 — Estação de munição

A estação verde fica próxima ao ponto inicial na Sala de Contenção.
Aproxime-se e pressione **E**: pacote de 30 balas por **180 CR**, com reserva
máxima de 90. Complementos parciais custam 6 CR por bala. A compra abastece
a reserva; use **R** para recarregar.

Sem nenhuma bala e sem saldo para o pacote, a estação oferece 15 balas de
socorro gratuitas. Novas concessões exigem 30 segundos de simulação; a pausa
congela essa espera. Não há créditos grátis nem socorro quando é possível comprar.

Validação, balanceamento e limites: [relatório M7.1](M7_1_TEST_REPORT.md).

## M8.1 — Perks de sessão

Quatro máquinas ficam junto à parede sul da Sala de Contenção, identificadas
por nome, cor e preço. Aproxime-se e use **E**:

| Perk | Preço | Benefício |
| --- | ---: | --- |
| Vitalidade | 2.500 CR | Vida máxima 150; +50 de vida atual ao comprar |
| Mãos Rápidas | 2.000 CR | Recarga 25% menor, a partir da próxima recarga |
| Impulso | 2.000 CR | Velocidade +12%, sem alterar o salto |
| Blindagem Reativa | 3.500 CR | Dano recebido -15% |

Máximo de quatro perks. Comprar novamente não cobra nem acumula efeitos.
Morte ou reinício removem todos. Estação de munição e porta permanecem disponíveis.

Consulte [M8_1_TEST_REPORT.md](M8_1_TEST_REPORT.md) para validação,
análise econômica até R15 e limitações dos testes na nuvem.

## M8.1.1 — Primeira integração de modelos (histórico)

Essa etapa usava uma pistola e um humanoide de Quaternius, com braços
para/MakeHuman. A seleção ativa foi revista no M8.1.2. Cache de recursos,
LOD e viewmodel com câmera própria preservam a simulação e o balanceamento.

Os modelos/adaptações continuam **provisórios para aceite de arte**:
não são arte final/AAA, e rigging, empunhadura e variantes ainda exigem revisão humana.
Fontes, modificações e licenças: [créditos dos assets](public/assets/manifests/ATTRIBUTION.md).
Plano: [M8_1_1_VISUAL_PLAN.md](M8_1_1_VISUAL_PLAN.md).
Validação e comparação: [M8_1_1_VISUAL_REPORT.md](M8_1_1_VISUAL_REPORT.md).

## M8.1.2 — M9 texturizada e infectados

A M9 recebe a Beretta 92 texturizada de Pixel32 e nova empunhadura dos braços
CC0. A arma fica na posição inferior lateral; o ADS alinha as miras mantendo
o hitscan e os atributos existentes. Os infectados usam os modelos de
Pixelhouse e Rosswet Mobile, com clips de ataque/morte, materiais PBR e LOD.
A sala ganha superfícies com desgaste, cabos e sinalização de contenção.

Os quatro GLBs ativos são locais e têm fontes/licenças registradas.
Revisão artística dos contatos/animações e profiling em GPU desktop continuam
pendentes; não foi comprovada a meta de 60 FPS.

[Comparação, testes e limitações](M8_1_2_VISUAL_REPORT.md) ·
[Pipeline dos assets](docs/ASSET_PIPELINE_M812.md) ·
[Créditos](public/assets/manifests/ATTRIBUTION.md)

## M8.1.3 — Polish da Sala de Contenção

Materiais em escala real, teto modular, equipamentos detalhados, sinalização
biológica e iluminação fria/ciano/vermelha. Layout e compras preservados; o novo
teto físico bloqueia saltos através do forro. Sem novo setor ou balanceamento.

[Relatório, capturas e testes](M8_1_3_ENVIRONMENT_REPORT.md) ·
[Registro da arte local](public/assets/manifests/environment-m813.json).
A meta de 60 FPS ainda requer GPU desktop: o relatório registra também a
regressão observada no renderizador por software, sem declarar homologação.

## M8.1.4 — Otimização e validação

Buffers indexados, roughness compartilhado no albedo, batches por região e
culling conservador dos infectados preservam o cenário M8.1.3. Kit visual e
luzes podem ser reutilizados em outros setores; nenhum foi criado nesta etapa.

[Resultados reais, testes e capturas](M8_1_4_OPTIMIZATION_REPORT.md) ·
[Kit reutilizável](docs/ENVIRONMENT_MODULE_KIT.md).
Medições são SwiftShader; 60 FPS em GPU desktop continuam pendentes.


## Desktop Windows x64

A versão desktop mantém a versão web e usa os mesmos sistemas de gameplay. Os assets essenciais (GLB, texturas, áudio e Rapier/WASM) estão no pacote; a execução não depende de Vite, Node ou internet.

Para baixar um build, abra [GitHub Actions — Windows Desktop Test Build](https://github.com/mestre-pogramador-ai/PROTOCOLDEADZONE/actions/workflows/desktop-windows.yml), escolha uma execução verde da versão desejada e baixe o artifact **PROTOCOL-DEAD-ZONE-Windows-x64**. Entre em uma conta com acesso ao repositório quando necessário e extraia o ZIP.

- `PROTOCOL-DEAD-ZONE-Portable.exe`: execução portátil.
- `PROTOCOL-DEAD-ZONE-Setup-0.9.5-x64.exe`: instalador NSIS.

Os pacotes de teste não têm assinatura digital; o Windows pode mostrar aviso de editor desconhecido. A aceleração GPU permanece habilitada por padrão. O smoke automatizado usa o app empacotado em Windows Server 2025 com renderer por software; os wrappers Portable/instalador e Windows 10/11 físico ainda exigem teste manual.

Build local (Windows x64 recomendado para gerar os EXEs):

```bash
npm ci
npm run desktop:build
```

Saída: `release/`. Para desenvolvimento, `npm run desktop:pack` gera a pasta do aplicativo para o sistema atual; `npm run desktop:start` abre o `dist/` já compilado. `npm run test:desktop` executa o smoke Electron, com `DESKTOP_EXECUTABLE` opcional apontando ao executável empacotado.

Detalhes, segurança, validação e limitações: [DESKTOP_BUILD_REPORT.md](DESKTOP_BUILD_REPORT.md).

## M8.1.4-A — Áudio de terror

Disparo e Foley da M9, impactos por material confirmado, vozes dos quatro arquétipos e ambiente posicional. Música com estados de menu, preparação/exploração, suspense, combate, vida crítica e Game Over. Crossfades e períodos de silêncio evitam reprodução contínua de uma única camada.

O áudio é desbloqueado após interação. Os controles de volume geral, efeitos, ambiente, música e mute ficam em **CONFIGURAÇÕES** e são persistidos localmente. A pausa suspende o contexto; o reinício reutiliza buffers e remove fontes antigas. Os limites são 32 vozes totais e 10 de infectados. A trilha final continua durante o Game Over.

Fontes/licenças: [manifest por arquivo](public/assets/audio/manifest.json) e [créditos de áudio](public/assets/audio/licenses/SOURCES.md), também identificados na interface. Pistola genérica: Michel Baradari (CC-BY 3.0); vozes: artisticdude (CC0); Foley: Kenney (CC0); impactos: rubberduck (CC0). Música, ambiente e alguns sinais são DSP original em WAV, não gravações de campo.

Validação registrada do código: **192 testes Vitest**, **13 verificações de movimento**, TypeScript, builds web/Electron, testes no Chromium e smoke Windows. Testes automatizados de decodificação, eventos e vozes **não substituem escuta com fones**. Não foi comprovada a meta de 60 FPS em GPU física.

Resultados, evidências e pendências: [M8_1_4A_AUDIO_REPORT.md](M8_1_4A_AUDIO_REPORT.md). Os relatórios dos marcos anteriores registram o estado de suas respectivas datas; consulte esta seção para a versão atual.
