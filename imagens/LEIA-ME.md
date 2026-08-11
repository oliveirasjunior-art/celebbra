# Pasta de imagens

Coloque aqui as fotos reais dos itens, com exatamente estes nomes de arquivo
(é assim que o `index.html` procura cada imagem — se o nome não bater, o
site mostra o emoji de reserva no lugar, sem quebrar o layout):

| Arquivo esperado             | Item no catálogo          |
|-------------------------------|----------------------------|
| mesa-cadeira-kit.jpg           | Kit Mesa + 8 Cadeiras       |
| pula-pula-castelo.jpg          | Pula-pula Castelo Médio     |
| toto-profissional.jpg          | Totó Profissional           |
| galpao-tenda-6x6.jpg           | Galpão / Tenda 6x6m         |
| piscina-bolinhas.jpg           | Piscina de Bolinhas         |
| cadeira-tiffany.jpg            | Cadeira Tiffany Branca      |

## Recomendações técnicas

- **Formato:** JPG ou WebP (WebP pesa menos, com qualidade parecida).
- **Tamanho da imagem:** por volta de 800x600px já é suficiente — os cards
  do site têm 150px de altura, então imagens maiores só deixam o carregamento
  mais lento sem ganho visual.
- **Peso do arquivo:** tente manter abaixo de 250–300KB por foto. Ferramentas
  gratuitas como squoosh.app ou tinypng.com resolvem isso em segundos.
- **Orientação:** paisagem (mais larga que alta) encaixa melhor no formato
  do card.

## Ao adicionar um novo item ao catálogo

1. Adicione o novo bloco `.card` no `index.html`, seguindo o padrão dos
   existentes.
2. Escolha um nome de arquivo consistente (ex: `piscina-inflavel-grande.jpg`)
   e use esse mesmo nome no atributo `src` da tag `<img>`.
3. Salve a foto aqui na pasta `imagens/` com esse nome exato.
4. Se preferir usar uma foto do próprio checklist de saída/volta do item
   (sugestão do README principal), é só copiar a melhor foto para cá.
