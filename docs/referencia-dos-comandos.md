# Referência dos comandos

O detalhe de cada comando do aula-pronta: o que ele grava, o que ele garante e os limites conhecidos. Para começar, leia o [README](../README.md). Termos em [GLOSSARY.md](../GLOSSARY.md).

## Começar um curso

Abra o Claude Code na pasta onde vai ficar o curso e rode:

```
/aula-pronta:iniciar
```

O comando cria:

| Item | Para quê |
|---|---|
| `aula-pronta.config` | Marca do curso: nome, logo, duas cores e rodapé (visual neutro, edite à vontade) |
| `aulas/` | Uma subpasta por aula, `NN-nome` |
| `lotes/` | Os textos de e-mail dos lotes |
| `wiki/` | A wiki do curso |
| `.gitignore` | Mantém o arquivo de chaves `.env`, as transcrições (`transcricao.md`) e os arquivos SRT das gravações (`gravacao.srt`) fora do controle de versão |

Rodar de novo numa pasta com conteúdo não apaga nem sobrescreve nada: cria só o que falta e avisa o que já existia.

A única exceção é o `.gitignore`. Se ele já existe e algum arquivo de chaves (`.env`, `.env.local`, `.env.production`, `.env.staging` ou outro liberado por uma linha `!`) não está de fato ignorado (falta a regra, ou uma linha como `!.env` ou `!.env.production` liberou um arquivo de chaves), o comando acrescenta `.env` e `.env.*` no fim do arquivo e repete no fim as liberações de arquivo de modelo que já havia (`!.env.example` e afins), para esses modelos continuarem no Git. Ele não apaga nem muda nenhuma linha existente, e avisa você. É o que protege a sua chave de ir para o Git.

A `transcricao.md` e a `gravacao.srt` têm cada uma a sua checagem, uma de cada vez e separadas da do `.env`. Cada uma está protegida só se o arquivo tem uma destas linhas: `transcricao.md`, `**/transcricao.md`, `aulas/`, `/aulas/`, `aulas/**` ou `*.md` (para a transcrição); `gravacao.srt`, `**/gravacao.srt`, `aulas/`, `/aulas/`, `aulas/**` ou `*.srt` (para a gravação); e depois da última delas não há nenhuma linha `!`, fora as que começam com `!.env`. Formas que pegam só um caminho, como `/transcricao.md`, `aulas/transcricao.md` ou `aulas/01*/`, não contam. O comando acrescenta no fim só o que falta, na ordem bloco do `.env`, `transcricao.md`, `gravacao.srt`, sem repetir o que já está protegido. Se tudo está protegido, o arquivo não é tocado.

O arquivo `aula-pronta.config` é um texto simples, uma linha `chave: valor` por item. Linhas com `#` no começo são comentário.

## Material do aluno e descrição de uma aula

Salve o SRT da aula na subpasta dela com o nome `gravacao.srt` (o CapCut, o YouTube e a plataforma do curso exportam esse arquivo) e rode:

```
/aula-pronta:pos-gravacao aulas/01-nome-da-aula
```

O comando:

1. converte `gravacao.srt` em `transcricao.md` (se a transcrição ainda não existe; se existe, usa a que está lá e nunca a edita);
2. lê a transcrição inteira e escreve `material.md`, o material do aluno em texto, com tudo o que foi dito na gravação;
3. escreve `descricao.md`, a descrição da aula (veja abaixo);
4. devolve a você um relatório: as falas tecnicamente erradas que ele corrigiu (com o minuto de cada uma), os dados sensíveis que apareceram na gravação (minuto e tipo, nunca o valor), os preços citados e as decisões que precisam do seu aval.

O que o material faz com o que foi dito:

- **Fala errada** sai corrigida, sem apontar o erro. Quem decide se vale regravar é você, pelo relatório.
- **Dado sensível** (senha, chave, e-mail, IP real...) não vai para o material nem para o relatório.
- **Preço ou limite** citado leva a data em que foi registrado.
- **Número da aula** é o prefixo da pasta, sem zeros à esquerda: `01-…` é a aula 1. Aula dividida em partes leva decimal em todas: `02.1-…` é a aula 2.1, `02.2-…` é a 2.2.
- Se `material.md` ou `descricao.md` já existe, o comando não sobrescreve: pergunta antes. O material e a descrição são independentes: com o material pronto e sem `descricao.md`, o comando grava só a descrição, sem mexer no material (útil para quem já tinha material de antes).

Estrutura do `material.md`, com estes títulos sempre presentes: `# Aula N: Título`, `## Para quem é`, uma ou mais `## Parte N: conceito` (com `### Resultado esperado` depois de cada demonstração e comandos e prompts em blocos de código), `## Prompt de bolso`, `## Tarefa`, `## Checklist`, `## Links` e `## Referência rápida`.

Precisa do [Node.js](https://nodejs.org) instalado, só para converter o SRT.

### Descrição da aula

A `descricao.md` fica na pasta da aula, ao lado do `material.md`, e serve para colar na plataforma onde você vende o curso. Não tem campo nem nome de nenhuma plataforma. Seções, sempre as mesmas: `# Descrição da aula N`, `## Título`, `## Descrição curta`, `## Descrição completa` (com a lista `Você vai ver:`) e `## Duração`.

- O texto sai do `material.md` (que já traz a fala corrigida e não tem dado sensível), nunca direto da transcrição.
- A duração é a da linha `Duração:` da `transcricao.md`, sem recalcular (no exemplo da aula 1, `10:32`).

## Página web e PDF do material do aluno

Com o `material.md` pronto, rode, com a pasta da aula:

```
/aula-pronta:pagina-pdf aulas/01-nome-da-aula
```

O comando grava, na pasta da aula, `material.html` (a página web) e `material.pdf`, com a marca do `aula-pronta.config`: nome do curso no alto, as duas cores, o logo (se houver) e o rodapé com o número da página no PDF. Os arquivos novos são preparados temporariamente e publicados só depois de toda a geração passar; uma falha anterior preserva o que já estava pronto. Com `--so-pagina`, só a página é publicada e o PDF fica como está. Sem navegador, a página nova sai, o PDF antigo é removido e o comando para explicando o que falta; sem pandoc, ou com cor ou logo inválido, o que já estava pronto fica como está. Os dois são refeitos do `material.md` a cada execução e têm o mesmo conteúdo dele: para mudar algo, mude o `material.md` e rode de novo.

- **Página web:** o pandoc converte o `material.md` com um modelo próprio do plugin (`skills/pagina-pdf/modelo.html`) e CSS de tela e de impressão. É um arquivo só: o logo vai embutido e nada vem de fora. Cabe em celular (sem rolagem lateral em 390 px).
- **Texto cru não vira HTML:** `<tag>` falada na aula, ou HTML que veio no SRT, aparece como texto na página. O pandoc lê o `material.md` só como Markdown simples (HTML cru, `<div>`/`<span>`, atributos entre chaves e matemática desligados), e a página ainda leva uma política de segurança (CSP) que barra script.
- **Imagens e links:** imagem do `material.md` precisa ser um arquivo png, jpg, jpeg, gif, webp ou svg (maiúscula tanto faz) dentro da pasta da aula, e entra dentro da página; imagem da internet, com caminho absoluto, com `..`, que chega a um arquivo de fora da pasta por atalho ou link, de outro tipo (pdf, vídeo, áudio, texto, o próprio `material.md`) ou que não existe faz o comando parar e dizer qual é. Há um limite conhecido: a imagem pode mudar entre a conferência e a cópia; essa janela é curta e a próxima execução corrige o resultado. Link só continua link se for `http`, `https`, `mailto` ou âncora (`#`); `javascript:`, `data:` e afins, e também link sem esquema (`../transcricao.md`, `./x`, `pagina.html`, `/x`, `//host/x`), ficam só como texto: o PDF guarda o link e a política da página não bloqueia navegação, então um link relativo abriria arquivos da pasta (como a transcrição).
- **PDF:** o Chrome ou o Edge, sem janela, imprime a página. O comando procura nos caminhos comuns do Windows, do Mac e do Linux. Sem nenhum dos dois, a página sai, o comando explica o que falta e para. As margens de impressão com o rodapé e o número da página exigem Chrome ou Edge 131 ou mais novo; num navegador mais velho o PDF sai sem esse rodapé.
- **Conferência:** o Claude lê o PDF página por página e corrige o `material.md` (só a forma, nunca o que ele diz) até não haver tabela cortada, título quebrado, código saindo da margem ou página quase vazia. Até 10 páginas o `Read` mostra todas; acima disso ele pede o `pdftoppm` (poppler) para ler por páginas, e o Claude avisa o que não conseguiu ver.
- **Sem pandoc:** o comando para e explica. Ele só instala depois do seu "sim" (`winget` no Windows, `brew` no Mac), pela opção `--instalar-pandoc` do script, para a skill continuar com `Bash(node:*)` e nada mais.
- Só a página, sem PDF: peça "só a página web" (o script aceita `--so-pagina`).
- Cores precisam estar em `#RRGGBB` e o logo (png, jpg, gif, webp ou svg) dentro da pasta do curso (aspas em volta do valor são aceitas); senão o comando para e diz o que corrigir.

### Limites conhecidos

- Se uma pasta de aula de outro curso for passada explicitamente, o script aceita o caminho e usa configuração desse curso.

Script e modelo: [`skills/pagina-pdf/`](../skills/pagina-pdf). Testes sem modelo: `node --test "skills/pagina-pdf/scripts/*.test.mjs"` (com aspas: o Node 22 não aceita a pasta sozinha). Variáveis `AULA_PRONTA_PANDOC` e `AULA_PRONTA_NAVEGADOR` apontam para outro pandoc ou navegador (os testes as usam para simular programa ausente).

## E-mail de um lote

Um lote é o conjunto de aulas liberadas juntas e anunciadas num único e-mail. Depois de rodar o `pos-gravacao` em cada aula, rode, com os nomes das pastas das aulas:

```
/aula-pronta:lote 01-luz-e-agua 02.1-montando-o-canteiro
```

O comando lê o `material.md` e a `descricao.md` de cada aula e grava **um** arquivo em `lotes/`, com nome previsível feito dos números das aulas (`lotes/lote-01-02.1.md`). Se esse arquivo já existe, pergunta antes de sobrescrever. O arquivo tem: assunto, pré-cabeçalho, um bloco por aula (título, duração e duas linhas da descrição), o aviso do material de apoio, a ordem de assistir e os marcadores `{{nome_do_aluno}}` e `{{link_do_curso}}`, que você preenche na sua ferramenta de e-mail.

- A ordem de assistir segue o número das aulas, não a ordem em que você digitou os nomes: `02.1` vem antes de `02.2`, e `10` depois de `02`.
- Se alguma aula do lote não tem `descricao.md` (ou `material.md`), o comando para sem criar nada e manda rodar o `pos-gravacao` nessa aula.
- O nome do curso vem do `aula-pronta.config`. O comando não abre a transcrição nem o SRT.
- **O aula-pronta nunca envia e-mail nem mensagem.** Ele só escreve o texto; quem copia e envia é você, pela sua ferramenta. Se você pedir para ele enviar, ele recusa e grava só o texto. A skill `lote` foi escrita para só ler e gravar arquivos (`allowed-tools: Read Write`, que só pré-aprova essas duas tools e não remove as outras), e nenhum comando do plugin envia nada.

## Wiki do curso

A wiki do curso é a base de conhecimento interna do infoprodutor, montada a partir das transcrições: uma página por aula e uma por conceito, ligadas entre si. Só você usa; o aluno não vê esta pasta. A ideia de uma wiki mantida por um modelo vem do gist "LLM Wiki" de [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f); esta implementação é própria, escrita do zero.

Com a `transcricao.md` de cada aula pronta (o `pos-gravacao` a gera), rode na pasta do curso:

```
/aula-pronta:wiki-do-curso ingerir
```

O que fica em `wiki/`:

| Item | Para quê |
|---|---|
| `regras.md` | As regras da wiki e o formato das páginas. O Claude o lê antes de cada operação. Criado uma vez, nunca sobrescrito: escreva as suas regras no fim |
| `raw/<aula>/transcricao.md` | A transcrição original, **idêntica byte a byte** (o hash de cada uma fica no registro). Ninguém edita |
| `aulas/<aula>.md` | Número, módulo e duração; resumo; conceitos que a aula ensina; conceitos que só cita; demonstrações; afirmações com o minuto |
| `conceitos/<nome>.md` | A definição como o curso ensina e todas as aulas onde aparece, cada uma marcada `ensina` ou `cita` |
| `indice.md` | Uma linha por página |
| `registro.md` | Uma linha por aula ingerida: pasta, hash da transcrição, data e bloco |

- **Incremental:** o comando só processa a aula que o registro ainda não tem. Rodar de novo sem aula nova não escreve nada; com uma aula nova, só ela é processada e as páginas das outras ficam como estavam (os conceitos que ela toca ganham uma linha).
- **Em blocos:** até **5 aulas novas** são processadas de uma vez. Com mais de 5, o comando trabalha em blocos de 5, na ordem dos números das aulas: copia as transcrições do bloco, escreve as páginas, registra, e só então começa o bloco seguinte. Um curso de centenas de aulas cabe assim no processo, e se ele for interrompido, a próxima rodada continua da primeira aula sem registro. O número 5 está em `LIMITE_BLOCO`, em `skills/wiki-do-curso/scripts/wiki.mjs`.
- **Aula regravada:** se a transcrição de uma aula já ingerida mudou, o comando avisa e não a processa sozinho; só com o seu "sim" ela é tratada como nova.
- **Página em dia com a transcrição:** o cabeçalho de cada página de aula traz `transcricao-sha256`, o hash da transcrição de que ela saiu. O `registrar` recusa a aula cuja página não atesta a cópia em `raw/` (por exemplo, uma troca com `--substituir` sem reescrever a página), e o `conferir` aponta a página que ficou para trás.
- **Quando algo ficou pela metade ou fora do lugar**, o `conferir` diz o que houve e o que fazer, sem apagar nada: troca de transcrição interrompida (`substituicao-interrompida`), aula interrompida (`aula-sem-registro`), página de aula sem pasta e sem registro (`pagina-orfa`), aula do registro cuja pasta sumiu (`aula-removida`) e linha do `registro.md` que não deu para ler (`registro-malformado`). Apagar é sempre com você.
- **Links:** nomes de aula com espaço, `%`, `#` ou parênteses viram links codificados (`%20`, `%25`...) no índice e nas páginas, e o `conferir` avisa o link com espaço sem codificar.
- **Dado sensível:** `raw/` guarda a fala inteira, inclusive o que de sensível foi dito, então a cópia **não é mascarada** (é por isso que ela é idêntica) e **é protegida pelo Git**: o arquivo se chama `transcricao.md`, nome que o `iniciar` já deixa fora do Git, e o comando confere com o próprio Git que `wiki/raw/` está ignorado antes de copiar (se não estiver, o próprio `copiar` recusa e manda rodar o `iniciar` de novo; se o Git der outro erro, como `dubious ownership`, a proteção fica "desconhecida" e a skill para e pergunta). Nenhuma página da wiki repete dado sensível. Não compartilhe nem publique `raw/`.
- O escopo do curso, que lê a wiki e propõe o que gravar em seguida, é a skill [`escopo-do-curso`](#escopo-do-curso), mais abaixo.

### Verificar a wiki

```
/aula-pronta:wiki-do-curso verificar
```

A verificação **relata tudo e grava uma única coisa**: a seção `## Avisos de contradição` das páginas de conceito, com uma linha por contradição (as duas aulas com link, os dois minutos e os dois valores) e "Nenhum aviso." nos conceitos sem contradição. A seção é reescrita inteira a cada rodada, então rodar de novo não duplica, e um aviso que deixou de valer sai. O resto não é corrigido nem escrito na wiki: link quebrado, página solta, lacuna e citação de um lado só vão só no relatório, e decidir qual aula está certa e corrigir fica com você. O relatório vem em cinco seções, e a que não tem achado diz "Nenhum":

- **Contradições**: duas aulas que dizem, sobre o mesmo conceito e na mesma situação, coisas que não podem valer juntas. Cada uma sai com **as duas aulas, os dois minutos** (conferidos na transcrição) e a fala de cada uma. Diferença de contexto (alface e tomate, muda e planta crescida) não é contradição e não é apontada.
- **Lacunas**: conceitos citados que nenhuma aula ensina, com as aulas e os minutos em que são citados. Propor a próxima aula a gravar é do escopo do curso.
- **Links quebrados**: o link que não leva a nenhum arquivo, com a página e a linha.
- **Páginas soltas**: a página de aula ou de conceito que nenhuma outra página liga. O `indice.md` e o `registro.md` listam tudo e não contam como ligação.
- **Citação só de um lado**: a aula lista um conceito e o conceito não lista a aula (ou o contrário), ou o `ensina`/`cita` diverge.

A parte mecânica é feita pelo próprio Claude, buscando nos arquivos com `Glob`, `Grep` e `Read`, **sem script** (o `wiki.mjs` serve à ingestão; o `conferir` olha o registro e as cópias, não acha página solta nem citação de um lado só). A parte de leitura é a comparação das afirmações de cada aula sobre o mesmo conceito. Os casos de teste estão em [`evals/`](../evals) (`verificar-*`) e em [`evals-wsl/verificar-sem-script`](../evals-wsl/verificar-sem-script).

### Consultar a wiki

```
/aula-pronta:wiki-do-curso consultar Já falei de calda de sabão?
```

Pergunte à wiki se o curso já falou de um conceito. A consulta **só lê**: não escreve nada na wiki. Ela abre o `indice.md`, acha o conceito pelo **sentido** da pergunta (não precisa usar o nome dele: "de quanto em quanto tempo eu adubo?" leva à Frequência da adubação), abre as páginas certas e **confere o minuto na transcrição** em `raw/` (se a página e a transcrição divergem, vale a transcrição). Toda afirmação sai com a aula e o minuto, como `Aula 5 [01:20]`.

- **Não está na wiki:** a resposta diz isso claramente, sem aula, sem minuto, sem "talvez" e sem o que o Claude sabe sobre horta.
- **Contradição:** se o conceito tem aviso gravado (pela verificação), a resposta mostra as duas aulas e os dois minutos, sem escolher um lado.
- **Lacuna:** conceito citado e nunca ensinado sai com as aulas e os minutos em que aparece e a frase de que nenhuma aula o ensina.

Os casos de teste estão em [`evals/`](../evals) (`consultar-*`) e em [`evals-wsl/consultar-sem-escrever`](../evals-wsl/consultar-sem-escrever).

A parte mecânica (achar aula nova, copiar, registrar, índice e conferir links) está em [`skills/wiki-do-curso/scripts/wiki.mjs`](../skills/wiki-do-curso/scripts/wiki.mjs), sem dependências. Testes sem modelo: `node --test "skills/wiki-do-curso/scripts/*.test.mjs"` (com aspas). O que exige leitura (resumo, conceitos, afirmações) fica com o Claude, na skill [`wiki-do-curso`](../skills/wiki-do-curso/SKILL.md).

### Escopo do curso

```
/aula-pronta:escopo-do-curso
```

O escopo **lê a wiki e grava um arquivo só: `wiki/escopo.md`**. Nenhuma página de aula nem de conceito, nem o `indice.md`, muda. O documento é **refeito inteiro a cada execução** e diz isso no topo ("não edite à mão"): rodar de novo depois de uma aula nova põe a aula no documento e tira o que deixou de valer, sem sobrar nada da versão anterior (nem uma anotação feita à mão). Ele tem quatro seções:

- **Mapa de módulos**: os módulos e as aulas de cada um, com a duração e o resumo, tirados do cabeçalho das páginas de aula.
- **Lacunas**: as mesmas que a verificação aponta, conceito citado e nunca ensinado, com as aulas e os minutos.
- **Ordem de assistir**: a aula que usa um conceito vem depois da que o ensina, e cada linha diz por quê. Aulas sem dependência ficam na ordem dos números. **Se duas aulas se usam uma à outra** (ciclo), o escopo não escolhe ordem: diz quais aulas e quais conceitos formam o ciclo e deixa a decisão com você. Aula que não ensina nem cita nenhum conceito vai em "Sem dado para ordenar".
- **Próximas aulas a gravar**: uma por lacuna, com o porquê (as aulas que citam o conceito, com minuto) e onde encaixa. Só saem lacunas que a wiki mostra: o escopo não sugere aula por palpite.

Wiki sem `indice.md` ou sem aula: o escopo diz que o `ingerir` vem primeiro e não grava nada. Os casos de teste estão em [`evals/`](../evals) (`escopo-*`) e em [`evals-wsl/escopo-sem-script`](../evals-wsl/escopo-sem-script). Testes sem modelo: `node --test "skills/escopo-do-curso/scripts/*.test.mjs"`.

### Formato da transcrição

A **transcrição** é um arquivo Markdown, `transcricao.md`, na pasta da aula. É a cópia fiel do que foi dito, com marcas de tempo. Todo comando que lê a transcrição (e o `/aula-pronta:transcrever`, que grava a partir do Groq) usa este formato:

```
# Transcrição

Duração: 10:32

[00:01] Olá, pessoal, bem-vindos à primeira aula do Horta em Casa.
[00:08] Eu sou a Marina, e hoje a gente vai falar das duas coisas...
[1:02:03] Marca depois de uma hora de gravação.
```

- Linha 1 é `# Transcrição`. A linha `Duração:` traz o maior fim entre os trechos; é dela que vem a duração da aula.
- Cada trecho é uma linha `[mm:ss] fala`, na ordem da gravação. Passando de 1 hora, `[h:mm:ss]`. A marca é o início do trecho, em segundos inteiros (sem arredondar para cima).
- Um trecho do SRT com mais de uma linha de texto vira uma linha só. Marcas HTML do SRT (`<i>`) saem.
- A transcrição, e o `gravacao.srt` de onde ela vem, guardam o que foi gravado, **inclusive dado sensível dito na aula**: eles não são publicados nem entregues ao aluno. Por isso o `iniciar` já deixa `transcricao.md` e `gravacao.srt` fora do Git (quem criou a pasta antes dessa versão deve rodar o `iniciar` de novo) e você não deve compartilhar esses arquivos. O material do aluno e o relatório nunca repetem esse dado.
- O script que converte, [`skills/pos-gravacao/scripts/srt-para-transcricao.mjs`](../skills/pos-gravacao/scripts/srt-para-transcricao.mjs), não tem dependências e se recusa a sobrescrever uma transcrição que já existe. Testes: `node --test skills/pos-gravacao/scripts/srt-para-transcricao.test.mjs`.

## Transcrever uma aula pelo Groq (sem SRT)

Quem não tem o SRT da aula pode transcrever a gravação pelo [Groq](https://groq.com) (Whisper), com a **sua** chave. No plano gratuito do Groq (sem cartão) não há cobrança, até 2 h de áudio por hora e 8 h por dia (conferido em 16/11/2026). Se passar disso, o Groq recusa (429) e o comando para na hora, sem gravar nada; gravação de mais de 2 h já sai com esse aviso na estimativa. No plano pago, o Groq cobra por hora de áudio, na sua conta. Passo a passo:

1. Crie uma chave em <https://console.groq.com/keys>.
2. Na pasta do curso, crie o arquivo `.env` com uma linha só: `GROQ_API_KEY=cole-a-chave-aqui` (o `iniciar` já deixa o `.env` fora do Git).
3. Salve o áudio ou o vídeo da aula na pasta dela como `gravacao.mp4` (ou `.mp3`, `.m4a`, `.wav`, `.flac`, `.ogg`, `.webm`) e rode:

```
/aula-pronta:transcrever aulas/01-nome-da-aula
```

O comando funciona em duas etapas, e a primeira não envia nada:

- **Conferir e estimar:** confere se a chave existe (só diz "encontrada", nunca mostra o valor) e mostra o **custo estimado**. Você responde "sim" ou para ali.
- **Transcrever (só depois do "sim"):** envia a gravação ao Groq e grava `transcricao.md` na pasta da aula, **no mesmo formato** que o SRT gera (veja "Formato da transcrição"). `/aula-pronta:pos-gravacao` lê essa transcrição como qualquer outra.

O que ele garante:

- **Sem chave**, para, explica como configurar e não cria arquivo nenhum.
- **A chave** nunca aparece na tela, em mensagem de erro nem em arquivo gerado: ela só vai no cabeçalho do pedido ao Groq. A skill nem abre o `.env`.
- **Custo antes da chamada:** a mensagem abre pelo plano gratuito (sem cobrança, com os limites); no plano pago, US$ 0,04 por hora de áudio no modelo padrão (`whisper-large-v3-turbo`; `--modelo whisper-large-v3` custa US$ 0,111). O Groq cobra no mínimo 10 s por envio. Valores conferidos na documentação oficial do Groq em **13/11/2026**: confira se mudaram.
- **Gravação grande:** o Groq aceita arquivos de até 25 MB (plano grátis) ou 100 MB (plano dev) por envio. O comando usa 24 MB como limite, converte para FLAC 16 kHz mono com o `ffmpeg`, corta em partes que cabem e junta tudo em ordem, com as marcas de tempo somadas. Cada parte é enviada sozinha, uma de cada vez. Se o arquivo for cortado em partes, no plano pago cada parte paga o mínimo de 10 s, então o valor real pode ser um pouco maior. **Atenção ao custo:** se uma parte falhar no meio, no plano pago o Groq já cobrou as partes enviadas, e rodar de novo cobra essas partes outra vez (no gratuito, elas gastam o limite de novo; o plugin não guarda o que já foi transcrito); o comando avisa isso junto da estimativa. O corte é seco, sem sobreposição: uma palavra exatamente na emenda pode sair partida. Gravação pequena é enviada como está, sem cortar nem converter; só que o `ffprobe` (que vem com o `ffmpeg`) ainda mede a duração dela para a estimativa, a menos que seja WAV.
- **Falha temporária** (429, erro 5xx do Groq, rede caiu) é repetida sozinha: até 4 tentativas no total, esperando 1 s, 2 s e 4 s, ou o tempo que o Groq pedir até 60 s. Se o Groq pedir mais de 60 s num 429 (o limite de áudio do plano gratuito, por exemplo), o comando para na hora e diz quantos minutos esperar. **Falha definitiva** (401 chave recusada, 400 pedido recusado) para na hora, com mensagem em português. Em qualquer falha nada é gravado: a `transcricao.md` só nasce com todas as partes prontas.
- Falta o `ffmpeg` (só para gravação grande ou que não é WAV): o comando diz como instalar (`winget install ffmpeg` no Windows, `brew install ffmpeg` no Mac) e para. Ele não instala nada.
- Se a `transcricao.md` já existe, não é sobrescrita (apague-a se a aula foi regravada). Só lê aulas dentro de `aulas/`.

Script e testes: [`skills/transcrever/`](../skills/transcrever). Testes sem modelo e **sem chamar o Groq** (o serviço é um `fetch` falso e um servidor HTTP local): `node --test "skills/transcrever/scripts/*.test.mjs"`. Os de corte precisam do `ffmpeg` e são pulados sem ele. Para testes, `AULA_PRONTA_GROQ_URL` (no ambiente ou no `.env`) troca o endereço do serviço, mas só aceita o Groq ou um servidor local; `AULA_PRONTA_LIMITE_BYTES`, `AULA_PRONTA_FFMPEG` e `AULA_PRONTA_FFPROBE` ajustam o limite e os programas.

## Curso de exemplo

[`exemplo/horta-em-casa/`](../exemplo/horta-em-casa) é um curso fictício. Ele é o ponto único de teste do plugin: cada caso da suíte roda sobre uma pasta vazia ou sobre uma cópia dele.

Aulas (só a gravação em SRT; o material e a transcrição são gerados pelos casos):

| Pasta | Para que serve |
|---|---|
| `aulas/01-luz-e-agua/` | Aula de uns 10 minutos com uma fala tecnicamente errada plantada (fotossíntese "à noite", em `[03:08]`) e um dado sensível fictício dito em voz alta (e-mail e senha, em `[07:42]`). Tem também preços e um prompt copiável |
| `aulas/02.1-montando-o-canteiro/`, `aulas/02.2-escolhendo-a-terra/` | Aula dividida em partes, para provar a numeração decimal (aulas 2.1 e 2.2) |
| `aulas/03-plantando-as-mudas/`, `aulas/04-adubando-a-horta/`, `aulas/05-folhas-amarelas-e-pragas/` | Três aulas curtas (de 3 a 4 minutos) para a wiki do curso. Cada uma só cita conceitos que ela mesma ou outra das três ensina, menos um (a lacuna, abaixo). Têm duas coisas plantadas e um dado sensível fictício (veja abaixo) |

Plantado nas aulas 3 a 5 (os tickets da wiki e do escopo procuram estas duas coisas; não as corrija):

- **Contradição:** a aula 4 manda adubar **a cada quinze dias** (`[01:28]`) e a aula 5 manda adubar **uma vez por mês, não mais que isso** (`[00:36]`), os dois sobre a frequência da adubação.
- **Lacuna:** o **composto** é citado e nenhuma aula o ensina: a aula 4 diz que fazer composto em casa "é assunto que a gente não vai ver aqui" (`[01:04]`), a aula 5 manda deixar a terra rica "com húmus ou composto curtido" (`[02:24]`) e a aula 2.2 só o usa na mistura da terra, sem dizer o que ele é nem para que serve (`[00:05]`: "uma de composto").
- **Dado sensível:** um número de WhatsApp fictício dito na aula 5 (`[02:35]`), que a wiki não pode repetir em nenhuma página.

Os casos que partem de um material já pronto (descrição da aula e lote) copiam `material.md` e `descricao.md` fictícios de [`evals-fixtures/`](../evals-fixtures), fora de `evals/` para o `claude plugin eval` não tomar essas pastas por casos. Eles não ficam em `exemplo/`: o `iniciar` e os casos do `pos-gravacao` partem de aulas sem material.

Todos os dados são inventados; o e-mail usa o domínio reservado `example.com`.
