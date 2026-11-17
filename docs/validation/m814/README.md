# Evidências M8.1.4

- `before-profile.json`: referência M8.1.3/71b6cea, protocolo 0/6/12/20 + ordem
  inversa. Duas janelas de 24 frames por carga. Inclui ablações diagnósticas.
- `after-profile.json`: código final e455c8f, mesmo protocolo e cenário.
  Culling ligado/desligado é um A/B dentro desse mesmo build, câmera invertida.
- `rejected-fullrough-experiment.json`: experimento intermediário, **não é o
  resultado final**. A especialização GGX foi retirada do produto.
- `fill-diagnostics.json`: vistas dominadas por teto/piso, 1280×720 e 640×360,
  PBR vs unlit. Apenas diagnóstico, sem mudar o preset/resolução de produção.
- `real-combat.json`: grupos 6/12/20, IA e dano reais, mira automática e munição
  finita. Scheduler de ondas desativado; não é uma campanha nem A/B de FPS.
- `combat-animation.json`: estados, FOV/ADS, munição, morte e resets no renderer.
- `combat-first-failure.json` e `head-reproduction.log`: falha real de margem
  visual no windup do Brutamontes, antes da correção. **Não são falhas finais**.
- `head-fixed.log`: repetição aprovada usando duração real e CCD corrigido.
- `resource-cycles.json`: três resets equivalentes, esperando cache aposentar
  assets de infectados antes de medir o estado limpo. Recursos de viewmodel ficam.
- `native-probe.json`: modo automático também selecionou SwiftShader; nenhuma
  medição em GPU real foi obtida. Não declarar 60 FPS desktop a partir daqui.
- `geometry-inventory.json`: byte lengths dos arrays CPU, não medição de VRAM.
- `summary.json`: agregação das medições; dados brutos mantêm os deltas originais.
- Demais JSON/logs: App de produção, compras, porta, testes/build, exportação F8/F9.

`gl.info` depende das vistas/objetos já enviados ao renderer. Não comparar números
absolutos entre os protocolos diferentes como se fossem uma única sessão.
Nenhuma captura foi retocada e nenhuma sessão manual foi declarada. APIs das
fixtures são excluídas do bundle normal. `SHA256SUMS` verifica os artefatos.
