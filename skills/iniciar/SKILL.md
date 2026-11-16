---
name: iniciar
description: Cria a pasta do curso do infoprodutor, com o arquivo de configuração, as pastas de aulas, lotes e wiki, e o .gitignore protegendo o .env. Use quando o infoprodutor pedir para iniciar, começar ou preparar a pasta do curso.
allowed-tools: Read Write Edit
---

# Iniciar a pasta do curso

Prepara a pasta atual para receber um curso. Você fala com um infoprodutor que não é programador: escreva em português simples, sem jargão, e use só os termos do glossário (curso, aula, lote, wiki do curso, material do aluno).

## Regra principal: nunca apagar nem sobrescrever

Antes de criar qualquer item da lista abaixo, confira se ele já existe com `Read`, um item de cada vez. Erro de "arquivo não existe" significa que o item não existe. Não use `Glob`: ele pode não achar arquivo oculto como `.gitignore`.

- Se o item **não existe**, crie.
- Se o item **já existe**, não toque nele. Só anote que já existia.

Nunca apague nada e nunca recrie um arquivo que já existe. Há **uma única exceção**: o `.gitignore`, descrito abaixo, que só ganha as linhas que faltam. `Edit` serve só para isso.

## O que criar

Tudo dentro da pasta atual:

| Item | O que é |
|---|---|
| `aula-pronta.config` | Marca do curso (conteúdo abaixo) |
| `aulas/LEIAME.md` | Cria a pasta `aulas/`. Cada aula ganha uma subpasta `NN-nome` |
| `lotes/LEIAME.md` | Cria a pasta `lotes/`. Cada lote tem um texto de e-mail |
| `wiki/LEIAME.md` | Cria a pasta `wiki/`, a wiki do curso |
| `.gitignore` | Protege o arquivo de chaves `.env`, as transcrições `transcricao.md` e as gravações `gravacao.srt` (regras abaixo) |

Crie cada arquivo com `Write`, que já cria a pasta que o contém. Não crie o arquivo `.env`: ele só aparece quando o infoprodutor precisar de uma chave.

### `aula-pronta.config`

Conteúdo exato (visual neutro, o infoprodutor edita depois em qualquer editor de texto):

```
# Marca do curso. Edite o que vem depois dos dois pontos e salve.
# Linhas que começam com # são só comentário.

# Nome do curso, como aparece no material do aluno.
nome-do-curso: Meu Curso

# Logo: caminho de uma imagem dentro desta pasta (por exemplo logo.png).
# Deixe em branco para não usar logo.
logo:

# As duas cores do material, no formato #RRGGBB.
cor-principal: #1F2937
cor-secundaria: #6B7280

# Texto do rodapé de cada página do material.
rodape: Material exclusivo dos alunos de Meu Curso
```

### `aulas/LEIAME.md`

```
# Aulas

Uma subpasta por aula, com o número da aula na plataforma no começo do nome:

- `01-boas-vindas/`
- `02-primeiros-passos/`

Aula dividida em partes leva decimal em todas: `07.1-instalacao/`, `07.2-configuracao/`.
```

### `lotes/LEIAME.md`

```
# Lotes

Um lote é o conjunto de aulas liberadas juntas e anunciadas num único e-mail.
Cada lote tem um texto de e-mail, e esse texto fica aqui. O aula-pronta nunca envia e-mail: você copia o texto e envia pela sua ferramenta.
```

### `wiki/LEIAME.md`

```
# Wiki do curso

A wiki do curso é a sua parte interna, montada a partir das transcrições das aulas.
Só você usa: o aluno não vê esta pasta.
```

### `.gitignore`

O `.gitignore` protege três coisas: o arquivo de chaves `.env`, as transcrições `transcricao.md` e os arquivos SRT das gravações `gravacao.srt`. Cada aula guarda os seus dois arquivos, que são cópia fiel do que foi dito e podem ter dado sensível dito na aula; por isso eles ficam fora do Git. O conteúdo completo, para quando o arquivo não existe, é:

```
.env
.env.*
transcricao.md
gravacao.srt
```

Se o `.gitignore` **já existe**, leia-o e faça **três checagens separadas**: do `.env`, da `transcricao.md` e da `gravacao.srt`. Nas três vale o **efeito final**, não só se as linhas estão lá. No `.gitignore` vale a **última** regra que casa com o arquivo.

#### Checagem do `.env`

Monte a **lista de nomes** a conferir:

- `.env`, `.env.local`, `.env.production` e `.env.staging`;
- mais todo nome **de arquivo de chaves** que uma linha `!` do arquivo libera: nome que é `.env` ou que começa com `.env.`, e que não é modelo (sem `example`, `sample` ou `template`). Exemplo: `!.env.prod` põe `.env.prod` na lista.
- Negações de **outros** arquivos não entram na lista e a checagem as ignora. Exemplo: `!README.md` ou `!dist/keep` não têm a ver com chaves, então um `.gitignore` com `.env`, `.env.*` e `!README.md` está protegido e não se toca nele.

**Está protegido** só se, para **cada** nome da lista, lendo o arquivo de cima para baixo, a **última** regra que casa com ele manda ignorar. Conferir só `.env` e `.env.local` não basta: `.env.local` ignorado não prova que `.env.production` está.

Regras que casam com esses nomes são, por exemplo, `.env`, `/.env`, `**/.env`, `.env*`, `.env.*`, `*.env` e `.*`. Linhas com `!` (negações, como `!.env`) contam: uma negação depois da regra que ignora desfaz a proteção. Linhas que começam com `#` e linhas em branco não contam.

Dois cuidados ao ler as regras:

- **Espaços:** só o espaço no **fim** da linha é ignorado. Espaço no começo faz parte do padrão: ` .env` (com espaço antes) não casa com `.env`.
- **Regra de pasta:** linha que termina em `/` (como `.env/` ou `.env*/`) só casa com pasta, não com o arquivo `.env`. Ela **não conta** como proteção.

Se o `.env` está protegido, ele não pede nada. Isso vale também para um arquivo que esta skill já consertou antes: ele ainda pode ter uma linha `!.env`, mas o bloco acrescentado no fim volta a ignorar todos os nomes da lista, então rodar de novo não muda nada.

**Não está protegido** (falta a regra, ou uma negação liberou um segredo, ou algum nome da lista não é ignorado). O `.env` pede o bloco abaixo, **sempre no fim do arquivo**, nesta ordem:

1. `.env`;
2. `.env.*`;
3. toda linha `!` que o arquivo já tinha e que libera um arquivo de **modelo**, repetida na mesma ordem em que aparece nele. É modelo o nome que tem `example`, `sample` ou `template`, como `!.env.example` e `!.env.production.example`. Assim esses modelos continuam indo para o Git, porque a última regra de cada um volta a ser a negação.

**Nunca** repita uma negação que libera segredo, como `!.env`, `!.env.local` ou `!.env.production`: ela desfaria de novo a proteção.

Nunca apague nem mude uma linha que já existe, nem mesmo a `!.env`: só acrescente.

#### Checagem da transcrição e da gravação

Dois arquivos de aula guardam tudo o que foi dito, inclusive dado sensível: `transcricao.md` e `gravacao.srt`. Confira **um de cada vez**, com a mesma regra. Não se simula um caminho de exemplo: uma regra pode pegar só um caminho e deixar as outras aulas rastreáveis. A checagem usa uma **lista fechada** de linhas.

**Está protegido** só se o arquivo tem uma destas linhas (espaço no fim da linha não conta; espaço no começo faz parte do padrão):

- `transcricao.md`: `transcricao.md`, `**/transcricao.md`, `aulas/`, `/aulas/`, `aulas/**`, `*.md`;
- `gravacao.srt`: `gravacao.srt`, `**/gravacao.srt`, `aulas/`, `/aulas/`, `aulas/**`, `*.srt`.

**e**, depois da **última** delas, não há nenhuma linha `!`, exceto as que começam com `!.env`. Aqui uma regra de pasta como `aulas/` **conta**, porque os dois arquivos ficam dentro de uma pasta de aula. A exceção do `!.env` é obrigatória: sem ela, o bloco do `.env` acrescentado depois da linha do arquivo faria a próxima execução acrescentar outra linha. Atenção: `*.md` protege só a transcrição e `*.srt` só a gravação; cada lista é do seu arquivo.

Qualquer outra forma **não conta**: `/transcricao.md`, `aulas/transcricao.md`, `transcricao.md/`, `/gravacao.srt`, `aulas/gravacao.srt`, `aulas/01-exemplo/`, `aulas/01*/` (pegam só uma raiz, um caminho ou uma aula). Uma linha `!` depois da última linha da lista (como `!aulas/02.2-x/transcricao.md` ou `!gravacao.srt`) desfaz a proteção. Na dúvida, **não está protegido**. Acrescentar o nome no fim é seguro: uma regra a mais não faz mal, e como ela é a última, a próxima execução vê "protegido" e não mexe.

#### O que acrescentar

Cada item vem da sua checagem; acrescente só o que **falta**, sempre no fim, nesta ordem:

1. o bloco do `.env` (`.env`, `.env.*` e as negações de modelo), se o `.env` não está protegido;
2. `transcricao.md`, se a transcrição não está protegida;
3. `gravacao.srt`, se a gravação não está protegida.

Nunca repita o que já está protegido: `.env` protegido não ganha o bloco de novo, e assim por diante. Se os três estão protegidos, **não toque no arquivo**.

Um `.gitignore` que esta skill já consertou antes cai no "não toque": rodar de novo não muda nada.

Como fazer, com `Edit` (vale para qualquer linha nova, sempre só no fim do arquivo):

1. Âncora: em `old_string` ponha a última linha **não vazia** do arquivo e as linhas em branco que vêm depois dela, até o fim. Em `new_string` ponha o mesmo trecho, uma quebra de linha e as linhas novas, uma por linha. Uma linha vazia nunca serve de âncora.
2. Se o `Edit` reclamar que o trecho não é único, inclua linhas anteriores, uma de cada vez, até o trecho ficar único.
3. Se o arquivo usa fim de linha do Windows (CRLF), as linhas novas também.
4. Não use `Write` para isso: reescrever o arquivo inteiro pode perder conteúdo.
5. Se o arquivo existe mas está vazio, ou tem só espaços e linhas em branco, conta como vazio: use `Write` com o conteúdo completo acima (`.env`, `.env.*`, `transcricao.md`, `gravacao.srt`).

## O que dizer no fim

Responda em português simples, em até quatro partes curtas:

1. **Criei:** a lista dos itens novos.
2. **Já existiam, não mexi:** a lista dos itens que já estavam lá. Um `.gitignore` que você alterou **não entra aqui**, só em "Alterei". Se não houve nenhum item, omita esta parte.
3. **Alterei:** só se acrescentou linhas a um `.gitignore` que já existia. Cite **só o que você acrescentou** (se entrou só `transcricao.md` ou só `gravacao.srt`, não fale do `.env`). Diga com destaque, por exemplo, quando entrou o `.env`: "Acrescentei `.env` ao seu `.gitignore`, para o arquivo de chaves nunca ir para o Git. O resto do arquivo ficou como estava." Se havia uma regra liberando um segredo (uma linha `!.env` ou `!.env.production`, por exemplo), diga isso também, citando a regra: "Havia uma regra (`!.env.production`) liberando um arquivo de chaves; agora ele volta a ficar fora do Git. Não apaguei a regra antiga." Se acrescentou `transcricao.md` e/ou `gravacao.srt`, diga também, em português simples, que os dois guardam tudo o que foi dito na aula, inclusive dado sensível, e por isso ficam fora do Git, citando só o nome que entrou: "Acrescentei `transcricao.md` e `gravacao.srt` ao seu `.gitignore`: a transcrição e o arquivo SRT de cada aula guardam tudo o que foi dito, até dado sensível, e por isso não vão para o Git." Se não acrescentou nada, omita esta parte.
4. **Próximo passo:** abrir `aula-pronta.config` e trocar o nome do curso, as cores e o rodapé.
