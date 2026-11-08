# M4.1 — Combat & AI Polish

## Escopo entregue
- Infected com estados `idle/chase/windup/active/recovery/hurt/dead`; dano aplicado uma única vez no início da fase ativa.
- Checagem de alcance **e** linha de visão no momento do ataque; golpes cancelados por dano não atingem.
- Invulnerabilidade de 0,65 s após dano recebido; `PlayerDamage` é autoridade única para HP.
- Grade local determinística com BFS para contornar obstáculos; recálculo espaçado; porta aberta/fechada afeta ocupação e rota.
- Teste de estresse com 1, 3 ou 6 infectados; alteração reinicia o conjunto de infectados (não a sessão).
- Rig procedural de placeholder com marcha, ataque, reação e queda, sem alegar ser asset humanoide final.
- Ferrolho visual da M9, HUD e modo tela cheia com botão.

## Limitações deliberadas
- Navegação BFS é local e não substitui navmesh 3D quando houver escadas/andares.
- O infectado é um modelo procedural de teste, **não** um personagem GLB licenciado e rigado com animações mocap.
- Som e efeitos finais ainda precisam de assets e integração; não se promete arte final nesta versão.
- A colisão de inimigos com jogador usa distância e linha de visão no plano XZ, não um corpo Rapier dedicado.
- A IA é determinística e simples, adequada para o slice e não para hordas grandes.

## Validação
`npm install && npm test && npm run build` e teste manual no navegador: iniciar, pointer lock, ADS, headshot, 1/3/6 inimigos, porta, pausa, reinício, morte e fullscreen. Sem dependências instaladas, não alegar que esses testes passaram.
