# Arquivos (index.js e add_nominatim_info.js)

Este repositório contém dois scripts em Node.js projetados para realizar operações específicas relacionadas à extração e aprimoramento de dados de árvores. Ambos os scripts fazem uso da biblioteca Puppeteer para web scraping e Axios para solicitações HTTP.

## Pré-requisitos

- [NodeJS](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Raspagem de dados

### Visão Geral

O script `index.js` é responsável por fazer web scraping de dados de árvores do site [arvores.sjc.sp.gov.br](https://arvores.sjc.sp.gov.br/). Utiliza-se o pacote `puppeteer` para navegação headless e coleta informações sobre árvores, como nome popular, nome científico, diâmetro à altura do peito (DAP), altura, laudos e imagens disponíveis.

### Uso

1\. Clone o repositório e mude o diretório para este:

```bash
git clone https://github.com/TapiocaAberta/Dados-Abertos-SJC
cd arborizacao-urbana
```

2\. Instale as dependências:

```bash
npm install
```

3\. Execute o script com o seguinte comando:

```bash
node index.js <totalPaginas> <idInicial> <tamanhoLote>
```

- `<totalPaginas>`: O número total de lotes a serem extraídos, e.g. 5.
- `<idInicial>`: O primeiro ID que será coletado, e.g. 101.
- `<tamanhoLote>`: O número de entradas, de dados de árvores, a serem extraídas em cada lote, e.g. 10.

### Exemplo

```bash
node index.js 5 101 10
# Este comando irá extrair dados da árvore dos IDs 101 a 150 em lotes de 10
# entradas, repetindo o processo para um total de 5 páginas.
```

## Enriquecimento de geocodificação reversa

### Visão Geral

O script `add_nominatim_info.js` aprimora uma coleção JSON com dados de geocodificação reversa (reverse geocoding) do Nominatim ([nominatim.org](https://nominatim.org/)). Ele utiliza a biblioteca Axios para realizar solicitações HTTP e p-limit para controlar a concorrência durante o processamento dos itens.

### Uso

1\. Certifique-se de ajustar as variáveis no script de acordo com suas necessidades:

- `jsonFilePath`: O caminho para o arquivo JSON original contendo os dados da coleção.

- `outputFilePath`: O caminho para o arquivo de saída que conterá a coleção aprimorada.

- `processedIdsFilePath`: O caminho para o arquivo que armazenará os IDs já processados.

- `saveInterval`: O intervalo de salvamento, que determina quantos itens processados devem ser salvos antes de criar um arquivo parcial.

2\. Execute o script com o seguinte comando:

```bash
node add_nominatim_info.js
```

## Observações

- Certifique-se de respeitar os termos de serviço dos serviços utilizados, incluindo o site de web scraping e a API do Nominatim.

- Em caso de erros durante a execução, verifique se as dependências estão instaladas corretamente.

## Ordenação e remoção de duplicatas

O script `dedup_data.js` é projetado para ordenar e remover duplicatas de um arquivo JSON de entrada (coleção de objetos com número identificador). Ele utiliza a biblioteca `fs/promises` para operações assíncronas de leitura e escrita de arquivos.

### Uso

Execute o script com o seguinte comando:

```bash
node dedup_data.js <arquivoEntrada> <arquivoSaida>
# `<arquivoEntrada>`: O nome do arquivo JSON de entrada.
# `<arquivoSaida>`: O nome do arquivo JSON de saída após a ordenação e remoção de duplicatas.
```

### Exemplo

```bash
node dedup_data.js data.json sorted_data.json
# Este comando classificará os dados do arquivo `data.json` com base na chave 'id' e removerá as duplicatas, salvando o resultado no arquivo `sorted_data.json`.
```