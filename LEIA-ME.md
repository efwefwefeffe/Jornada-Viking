# Jornada Viking

Extraia a pasta e abra `index.html` para conferir os sprites, pausar as animações e selecionar um quadro. O botão **Controlar herói** abre a prévia de movimento.

| Tecla | Ação na prévia |
| --- | --- |
| A/D ou ←/→ | Mover |
| W, ↑ ou Espaço | Saltar. Pressione de novo no ar para o salto duplo. |
| S ou ↓ | Agachar |
| F | Golpear com o machado |
| R | Arremessar o machado girando |
| Esc | Sair do controle |

## Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `assets/personagens/` | Um PNG por quadro do herói, chefão e dois inimigos. |
| `assets/blocos/` | Grama, bordas de plataforma, paredes, pilar, pedra e caixas. |
| `assets/objetos/` | Moeda em quatro quadros, baús, caixa, ícones, efeitos e machado giratório. |
| `assets/cenario/` | Fundo panorâmico, portão, torre, tocha, bandeira, barril, cerca, vegetação e dracar. |
| `assets/interface/` | Placas, moldura da barra do chefão, botões e ícone de tela cheia. |
| `assets/referencia-telas/` | As quatro telas recortadas da imagem enviada, com o texto original. |
| `assets/atlas.png` | Atlas RGBA dos sprites e uma miniatura do fundo. O fundo panorâmico também tem PNG próprio. |
| `assets/sprites.json` | Retângulos do atlas, pivôs, ordem dos quadros, FPS, repetição e evento de soltura. |
| `assets/sprites-data.js` | Os mesmos metadados em JavaScript para carregar por `<script>`. |
| `sprites.js` | Leitura da animação e desenho de recortes no Canvas 2D. |

Os quadros do herói foram reconstruídos a partir da referência. Os quadros em que ele empunha o machado usam a mão direita na vista-base. A animação `arremesso` usa três quadros. O segundo é a soltura e registra no JSON o ponto de onde sai o projétil, relativo ao pivô do herói. O machado do projétil tem 12 PNGs de 30° cada em `assets/objetos/machado-projetil/`, com pivô central fixo e ciclo sugerido de 24 FPS.

## Uso no seu projeto

Copie `assets/` e `sprites.js` e carregue estes scripts antes do seu JavaScript.

```html
<script defer src="assets/sprites-data.js"></script>
<script defer src="sprites.js"></script>
<script defer src="jogo.js"></script>
```

Dentro da inicialização assíncrona do jogo, carregue a textura uma vez. No seu loop de desenho, use o `ctx` de Canvas 2D, as posições do personagem e o tempo acumulado da animação em milissegundos. Para os personagens, `x` e `y` são a posição do pivô na base do sprite.

```js
const { atlas, assets, frames } = window.JornadaViking
const { loadImage, frameIndex, draw } = window.VikingSprites
const textura = await loadImage(atlas)
const corrida = assets.heroi.animations.correr

const quadro = corrida.frames[frameIndex(corrida, tempoDaAnimacaoMs)]
draw(ctx, textura, frames[quadro], x, y, { scale: 0.5, flip: olhandoEsquerda })
```

Use `assets.heroi.animations.arremesso.events[0]` para detectar a transição para o quadro de soltura. Crie um projétil uma vez por arremesso, aplique a escala do herói aos dois componentes de `offset` e inverta o sinal de `offset.x` quando estiver olhando para a esquerda. Para desenhar o projétil, use `assets["machado-projetil"].animations.girar` com o tempo próprio dele e a posição do centro do machado.

Em HTML/CSS, você pode usar os PNGs individuais como `src` de um `<img>`. O tamanho do PNG e o pivô são fixos entre os quadros de cada personagem e do machado. Para um bloco ou objeto, `content` descreve a área do desenho dentro do quadro do atlas. O exemplo `drawFit` em `sprites.js` usa essa área para desenhar o solo em sequência.
