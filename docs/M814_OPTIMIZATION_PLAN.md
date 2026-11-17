# M8.1.4 — Referência e decisões

Base: `71b6cea0443ad886b921ea39232422287ff0c63b`, M8.1.3/PR #9.
Branch: `m8.1.4-containment-optimization`. Main permanece `12afa63`.
Cadeia pendente verificada no GitHub: #6 (M8.1) → #7 (M8.1.1) → #8
(M8.1.2) → #9 (M8.1.3), todos MERGEABLE na conferência inicial. Sem merge.

Protocolo: Chromium 156, SwiftShader explícito, 1280×720, DPR 1, FOV 80;
24 frames após oito de aquecimento, cargas 0/6/12/20 e ordem inversa,
sem builds/testes concorrentes. Câmeras e poses da fixture controladas;
combate e IA reais são validados separadamente. Guardar arrays de deltas,
submissão CPU de gl.render, calls, triângulos e recursos; não chamar CPU de GPU.

A referência mostrou forte custo de iluminação PBR. Ensaios diagnósticos
sem sombra, mapa separado de roughness ou vidro quase não mudaram o tempo;
sem iluminação o FPS aumentou. Esses modos são exclusivos da fixture.

Intervenções: compartilhar albedo/roughness no mesmo texel, indexar buffers
sem remover triângulos, separar batches por região, usar bounds conservadores
de animação para culling da câmera e sombra independentes. Manter todas as
348 peças, geometrias/LOD/texturas dos personagens e todos os sistemas físicos.

O protótipo de GGX de roughness=1 era algebricamente equivalente, mas o A/B
isolado não demonstrou vantagem consistente. Foi removido da versão final;
o concreto continua com MeshStandardMaterial padrão. Não simplificar PBR
ou trocar por materiais unlit para obter um resultado artificial.

Extrair kit visual e tema de placas para reutilização, com snapshot do M8.1.3.
Não criar outro setor. Validar suíte, Rapier, build, movimento, Chromium,
compras, combate, reinício, evidências gráficas e status GitHub na entrega.
