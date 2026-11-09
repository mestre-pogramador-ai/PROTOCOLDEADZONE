# PROTOCOL: DEAD ZONE

**M8.1.1 — Integração visual GLB (v0.9.2)** · FPS 3D de sobrevivência no navegador, em desenvolvimento.

Este projeto mantém os marcos M0–M6.2 e introduz variantes de infectados nas rodadas. A primeira arena inclui:
menu, partida, preparação, rodadas, infectados, combate M9, créditos, porta comprável,
pausa, derrota, relatório e reinício. **Não é o jogo final nem uma demo comercial.**

## Requisitos

- Node.js 20.19+ ou 22.12+ e npm
- Navegador desktop com WebGL 2 (Chrome/Edge recomendados)
- Dispositivo de áudio opcional (AudioContext habilitado após clique do jogador)

## Instalação

```bash
npm install
npm run dev
```

Abra a URL local informada pelo Vite. Para testes e compilação:

```bash
npm run test:motion
npm test
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
| E | Interagir com estação de munição ou porta próxima |
| T | Começar a próxima onda antes do fim da preparação |
| Esc | Pausar e liberar o mouse |

## Funcionalidades deste milestone

- Simulação central de 60 Hz com física Rapier manual e uma única ponte R3F.
- **M6.1:** cápsula cinemática controlada pelo KCC Rapier; deslizamento em paredes,
  detecção de chão por contatos, autostep, snap-to-ground e câmera interpolada.
- Infectado Comum com perseguição, separação, preparação do ataque, dano e morte.
- Rodadas escaláveis, sistema de créditos com transações idempotentes, porta comprável.
- Menus e HUD integrados ao viewport, com opção de tela cheia.
- Configurações locais: volumes de áudio, mute, FOV, mouse, redução de movimento.
- Efeitos sonoros sintetizados no navegador, sem assets externos essenciais.
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

**Limitações:** modelos e sons são placeholders; não há setores adicionais,
armas alternativas, missões, progressão meta, multiplayer ou extração neste marco.
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
