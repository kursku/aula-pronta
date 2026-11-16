# aula-pronta

Plugin do Claude Code para infoprodutores. Você grava as aulas do curso; o aula-pronta transforma cada gravação em **material do aluno**, **descrição da aula**, **e-mail do lote**, e monta uma **wiki do curso** para você saber o que já ensinou e o que falta gravar.

Tudo roda na sua máquina, dentro do Claude Code. O plugin **nunca envia e-mail nem mensagem**: ele só escreve arquivos, e quem publica ou envia é você.

Os termos (aula, lote, wiki do curso...) estão em [GLOSSARY.md](GLOSSARY.md).

## O que você precisa ter

| Item | Para quê | Obrigatório? |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | Roda o plugin. Desktop, Cowork e claude.ai não servem: lá os scripts não rodam na sua máquina | Sim |
| [Node.js](https://nodejs.org) | Converte a legenda (SRT) em transcrição e roda os scripts do plugin (testado na versão 22) | Sim |
| [Pandoc](https://pandoc.org) | Gera a página web e o PDF do material do aluno. Se faltar, o plugin pergunta antes de instalar | Só para `pagina-pdf` (página web e PDF) |
| Google Chrome ou Microsoft Edge | Imprime o PDF | Só para o PDF |
| [ffmpeg](https://ffmpeg.org) | Corta gravações grandes antes de enviar ao Groq | Só para `transcrever` com áudio grande |
| Conta no [Groq](https://groq.com) | Transcreve a gravação quando você não tem o SRT. Cobra por minuto de áudio, na sua conta | Não |

Você também precisa de uma **legenda (SRT)** de cada aula. O CapCut, o YouTube e a plataforma do curso exportam esse arquivo. Sem SRT, use o `transcrever` (veja abaixo).

## Instalar

Dentro do Claude Code, rode as duas linhas:

```
/plugin marketplace add kursku/aula-pronta
/plugin install aula-pronta@aula-pronta
```

Depois confira: digite `/aula-pronta:` e os comandos aparecem na lista.

No Claude Code 2.1.275 ou mais novo, um único comando faz as duas coisas:

```
/plugin install aula-pronta --marketplace kursku/aula-pronta
```

Pelo terminal, sem abrir o Claude Code (2.1.292 ou mais novo): `claude plugin install aula-pronta --marketplace kursku/aula-pronta`.

## Começar em 5 minutos

1. Crie uma pasta vazia para o curso e abra o Claude Code nela.
2. Rode `/aula-pronta:iniciar`. Ele cria `aula-pronta.config` (nome do curso, cores e rodapé), as pastas `aulas/`, `lotes/` e `wiki/`, e um `.gitignore` que deixa a sua chave e as transcrições fora do Git. Rodar de novo não apaga nada.
3. Dentro de `aulas/`, crie uma pasta por aula, com o número da aula no começo do nome: `01-boas-vindas`, `02-primeiros-passos`. Aula dividida em partes leva decimal: `07.1-instalacao`, `07.2-configuracao`.
4. Salve o SRT de cada aula na pasta dela, com o nome `gravacao.srt`.
5. Rode o `pos-gravacao` (veja abaixo).

## Os comandos

### v1: material, página, PDF e e-mail do lote

| Comando | O que faz |
|---|---|
| `/aula-pronta:iniciar` | Cria a estrutura do curso numa pasta |
| `/aula-pronta:pos-gravacao aulas/01-boas-vindas` | Lê a gravação e escreve `material.md` (material do aluno) e `descricao.md` (descrição da aula) |
| `/aula-pronta:pagina-pdf aulas/01-boas-vindas` | Transforma o `material.md` numa página web e num PDF com a marca do curso |
| `/aula-pronta:lote 01-boas-vindas 02-primeiros-passos` | Escreve em `lotes/` o texto do e-mail que anuncia essas aulas |

Exemplo do `pos-gravacao`: com `aulas/01-luz-e-agua/gravacao.srt` salvo, o comando cria `transcricao.md`, `material.md` e `descricao.md` na mesma pasta e devolve um relatório com:

- as falas tecnicamente erradas que ele corrigiu, com o minuto de cada uma (quem decide se vale regravar é você);
- os dados sensíveis ditos na gravação, com minuto e tipo, **nunca o valor**;
- os preços citados e o que precisa do seu aval.

O comando não sobrescreve nada: se `material.md` ou `descricao.md` já existe, ele pergunta antes.

Exemplo do `lote`: `/aula-pronta:lote 01-luz-e-agua 02.1-montando-o-canteiro` grava `lotes/lote-01-02.1.md`, com assunto, um bloco por aula, a ordem de assistir e os marcadores `{{nome_do_aluno}}` e `{{link_do_curso}}`, que você preenche na sua ferramenta de e-mail.

### v2: transcrever sem SRT

Para quem só tem o áudio ou o vídeo da aula. Salve a gravação (`gravacao.mp4`, `.mp3`, `.m4a` ou `.wav`) dentro da pasta da aula, por exemplo `aulas/01-boas-vindas/gravacao.mp4`, e rode:

```
/aula-pronta:transcrever aulas/01-boas-vindas
```

O comando envia a gravação ao Groq com a **sua** chave e grava `transcricao.md`.

1. Crie uma chave em <https://console.groq.com/keys>.
2. Na pasta do curso, crie o arquivo `.env` com uma linha só: `GROQ_API_KEY=cole-a-chave-aqui`.
3. Rode o comando. Ele **mostra o custo estimado e espera o seu "sim"** antes de enviar qualquer coisa.

A chave nunca aparece na tela nem em arquivo gerado. Valor de referência: US$ 0,04 por hora de áudio (conferido em 13/11/2026; confira se mudou).

### v3: wiki do curso e escopo do curso

Com a `transcricao.md` de cada aula pronta:

| Comando | O que faz |
|---|---|
| `/aula-pronta:wiki-do-curso ingerir` | Monta a wiki do curso em `wiki/`: uma página por aula e uma por conceito, ligadas entre si. Só processa a aula que ainda não entrou |
| `/aula-pronta:wiki-do-curso verificar` | Aponta contradições entre aulas, lacunas, links quebrados e páginas soltas |
| `/aula-pronta:wiki-do-curso consultar Já falei de calda de sabão?` | Responde se o curso já falou do assunto, com a aula e o minuto. Só lê, não escreve |
| `/aula-pronta:escopo-do-curso` | Escreve `wiki/escopo.md`: mapa de módulos, lacunas, ordem de assistir e próximas aulas a gravar |

Exemplo do `consultar`: a pergunta "de quanto em quanto tempo eu adubo?" leva ao conceito certo mesmo sem o nome dele, e a resposta cita `Aula 4 [01:28]` e `Aula 5 [00:36]`. Se o curso nunca falou do assunto, a resposta diz isso, sem palpite.

A wiki guarda a transcrição inteira em `wiki/raw/`, **inclusive dado sensível dito na aula**. O `iniciar` já deixa as transcrições fora do Git: não compartilhe nem publique essa pasta.

## Experimente com o curso de exemplo

[`exemplo/horta-em-casa/`](exemplo/horta-em-casa) é um curso fictício (Horta em Casa) com seis aulas em SRT, feito para testar o plugin sem usar o seu curso. Todos os dados são inventados.

1. Copie a pasta para fora deste repositório (por exemplo, para `~/horta-em-casa`) e abra o Claude Code nela.
2. Rode `/aula-pronta:iniciar`: ele reconhece o que já existe e só cria o que falta.
3. Rode `/aula-pronta:pos-gravacao aulas/01-luz-e-agua` e o mesmo para `aulas/02.1-montando-o-canteiro`. Depois rode `/aula-pronta:pagina-pdf aulas/01-luz-e-agua` e `/aula-pronta:lote 01-luz-e-agua 02.1-montando-o-canteiro`.
4. Rode o `pos-gravacao` nas aulas 3, 4 e 5, depois `/aula-pronta:wiki-do-curso ingerir`, `/aula-pronta:wiki-do-curso verificar` e `/aula-pronta:escopo-do-curso`. A wiki vai achar a contradição e a lacuna que foram plantadas nessas aulas.

O que está plantado em cada aula (a fala errada da aula 1, o dado sensível fictício, a contradição da adubação, a lacuna do composto) está descrito na [referência dos comandos](docs/referencia-dos-comandos.md#curso-de-exemplo).

## Mais detalhe

- [Referência dos comandos](docs/referencia-dos-comandos.md): tudo o que cada comando grava, garante e não faz, o formato da transcrição e os limites conhecidos.
- [Desenvolvimento do plugin](docs/desenvolvimento.md): testes sem modelo, suíte do `claude plugin eval` e como rodar no WSL. É para quem mexe no código, não para quem usa o plugin.

## Licença

[MIT](LICENSE).
