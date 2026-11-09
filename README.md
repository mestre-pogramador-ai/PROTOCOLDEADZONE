# PROTOCOL: DEAD ZONE

**M6.1 — FPS Movement Stability (v0.7.1)** · FPS 3D de sobrevivência no navegador, em desenvolvimento.

Este projeto mantém os marcos M0–M6 e corrige a estabilidade de movimento do jogador. A primeira arena inclui:
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
| E | Comprar/abrir a porta (750 CR) |
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

**Limitações:** modelos e sons são placeholders, não há novos setores, novos inimigos,
armas alternativas, missões, progressão meta, multiplayer ou extração neste marco.
Leia `docs/M6_VERTICAL_SLICE.md` para mais detalhes.

## M6.2 — estabilidade, combate e IA

Correções e evidências: [relatório M6.2](docs/M6_2_VALIDATION.md).
Diagnóstico: **F8** marca um problema; **F9** ou **BAIXAR ERROS** exporta
um relatório local de eventos e amostras da simulação, sem dados privados.
Execute `npm test`, `npm run test:motion` e `npm run build` para validar.
O aceite visual em hardware real e o agachamento com redução física da cápsula
continuam pendentes; M7 não foi iniciado.
