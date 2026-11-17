# M8.1.3 — Arte de ambiente local

Os novos meshes de ambiente, pixels de texturas e sinalização definidos em
`environment-m813.json` são arte original deste projeto, disponibilizada sob
CC0 1.0 (texto em `CC0-1.0.txt`). Não há modelo de terceiros ou imagem externa
adicionado neste milestone. Esse escopo não altera as licenças das armas,
braços, infectados, bibliotecas ou código preexistentes.

São gerados no mount, agrupados por material, e descartados no unmount.
Não existem GLBs novos de cenário nem dependências remotas durante a partida.
Os chanfros usam 44 triângulos por carcaça, superfícies planas usam 12 por bloco,
os condutos usam cilindros de 8 lados. Não representam novos personagens.

O atlas contém placas de biossegurança, falha de selagem, intertrava, console,
munição, armário elétrico, caixas, marcações e manchas. As regiões possuem
padding e UVs próprios. Albedos e mapas de roughness compartilham resolução e
escala em metros. Metal, borracha e vidro usam respostas PBR distintas.

Luminárias emissivas não criam luzes dinâmicas adicionais. O orçamento permanece
uma direcional com sombra 1024 e duas pontuais sem sombra. Iluminação indireta é
aproximada por ambiente/hemisfério; não há GI, bloom nem reflexos em tempo real.
