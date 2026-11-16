---
name: lote
description: Escreve o texto do e-mail de um lote de aulas liberadas juntas, com um bloco por aula, a ordem de assistir e marcadores para o link do curso e o nome do aluno. Use quando o infoprodutor pedir o e-mail do lote, o aviso de aulas novas aos alunos ou passar as aulas que saem juntas.
argument-hint: 01-luz-e-agua 02.1-montando-o-canteiro
allowed-tools: Read Write
---

# Lote: o texto do e-mail

Você fala com um infoprodutor que não é programador: escreva em português simples, sem jargão, e use só os termos do glossário (aula, lote, material do aluno, descrição da aula, aluno, curso).

**Você só escreve o texto. Nunca envia e-mail nem mensagem a ninguém.** Se o infoprodutor pedir para enviar, mandar ou disparar o e-mail ou um aviso aos alunos, recuse: diga que o aula-pronta só escreve o texto e que ele copia o arquivo e envia pela ferramenta de e-mail dele. Mesmo assim grave o texto, se o resto do pedido pedia isso.

## Quais aulas

As aulas vêm em `$ARGUMENTS`: os nomes das pastas das aulas, separados por espaço, como `01-luz-e-agua 02.1-montando-o-canteiro`. Pode vir junto um pedido em palavras (como "e manda para 300 alunos"). Tire o `aulas/` ou `aulas\` do começo de cada palavra. **É pasta de aula a palavra com prefixo numérico seguido de `-`**: `01-…`, `02.1-…`, `10-…`. Número sozinho (`300`, `2`) é texto livre. Palavra sem número pode ser pasta ou texto: a regra 4 decide. Acerte antes de tudo:

1. Sem nenhuma pasta de aula nem pasta sem número (regra 4): pergunte quais aulas fazem parte do lote e pare.
2. `aulas/01-luz-e-agua`, `aulas\01-luz-e-agua` e `01-luz-e-agua` valem a mesma pasta: `aulas/01-luz-e-agua`, sempre com `/` nos caminhos. Pasta repetida conta uma vez.
3. Só trabalhe dentro de `aulas/` da pasta atual: recuse caminho com `..` ou fora dela.
4. Palavra sem prefixo numérico, só com letras, números, `-` ou `_` (como `luz-e-agua` ou `bonus`): use `Read` no caminho `aulas/<palavra>`. Erro avisando que é uma pasta (`EISDIR`): ela existe, é pasta sem número. Erro de "arquivo não existe", ou leitura que deu certo porque é um arquivo: é texto livre, como `segunda-feira`. Qualquer outro erro: conte o erro e **pare**. Palavra com outro sinal (`.`, `/`, `?`) é texto livre, sem `Read`. Pasta sem número, pasta com prefixo só de zeros (`00-…`) ou duas pastas com o mesmo número: **pare** e peça para renomear a pasta com o número certo da aula (como `03-luz-extra`) e rodar o comando de novo.

**Número da aula** = prefixo do nome da pasta (o que vem antes do primeiro `-`), sem zeros à esquerda: `01-…` é a aula 1; `02.1-…` é a aula 2.1. Nunca renumere nem invente número.

**Ordem de assistir** = ordem numérica dos números, não a ordem em que o infoprodutor digitou: compare número por número, e as partes depois do ponto também (1, 2.1, 2.2, 3, 10). `02.1` vem antes de `02.2`, e `10` vem depois de `02`.

## Conferir os arquivos de cada aula

Confira com `Read` (nunca `Glob`), um arquivo de cada vez, `<pasta>/material.md` e `<pasta>/descricao.md` de **todas** as aulas. Só o erro de "arquivo não existe" significa que o arquivo não existe. Qualquer outro erro (sem permissão, arquivo bloqueado, pasta no lugar do arquivo): conte o erro e **pare**.

**Falta o `material.md` ou a `descricao.md` de alguma aula: pare, sem criar nada.** Diga quais aulas faltam e peça para rodar `/aula-pronta:pos-gravacao` nelas (ele escreve o material e a descrição). Não escreva a descrição você mesmo.

Confira ainda, em cada `descricao.md`, que há a seção `## Duração` com um valor. Sem ela, a `descricao.md` é de outro formato: **pare, sem criar nada**, e peça para rodar `/aula-pronta:pos-gravacao` nessa aula (que pergunta antes de sobrescrever).

Leia também `aula-pronta.config` e pegue o valor de `nome-do-curso:`. Sem esse arquivo, pare e peça para rodar `/aula-pronta:iniciar`.

Não abra `transcricao.md` nem `gravacao.srt`: eles guardam tudo o que foi dito, inclusive dado sensível. O texto do e-mail sai só do `material.md` e da `descricao.md`.

## Escrever o e-mail

O arquivo é `lotes/lote-<números>.md`, com os prefixos das pastas, na ordem de assistir, separados por `-`: as aulas `02.1-…` e `01-…` dão `lotes/lote-01-02.1.md`. Confira com `Read` se ele existe. **Se existe, não escreva**: pergunte se o infoprodutor quer sobrescrever e pare. Só sobrescreva depois do "sim". Escreva **um** arquivo, com `Write`, e nenhum outro.

Se não existe, crie com este formato:

````
# E-mail do lote: aulas 1 e 2.1

Assunto: (uma linha, cita o curso e o que chegou)
Pré-cabeçalho: (uma linha curta, o que o aluno vai aprender)

Olá, {{nome_do_aluno}}!

(1 ou 2 frases: chegaram aulas novas do curso NOME DO CURSO)

## Aula 1: Título da aula
Duração: 10:32
(duas linhas da descrição)

## Aula 2.1: Título da aula
Duração: 01:05
(duas linhas da descrição)

**Material de apoio:** cada aula tem um material em texto, com o passo a passo, os comandos e a tarefa. (frase curta, no mesmo sentido)

**Ordem de assistir:**
1. Aula 1: Título da aula
2. Aula 2.1: Título da aula

Acesse o curso: {{link_do_curso}}

(despedida curta, assinada com o nome do curso)
````

- **Lote de uma aula só**: escreva no singular, no título (`# E-mail do lote: aula 1`) e no texto ("chegou uma aula nova"), e **omita** a ordem de assistir.
- Um bloco por aula, **na ordem de assistir**. O título e o texto vêm da `descricao.md` (seção `## Título` e descrição curta e completa), sem inventar nada que ela não diga. O número do bloco é o número da aula.
- **Duas linhas da descrição** em cada bloco: duas linhas curtas, tiradas da `descricao.md`.
- **Duração**: o valor da seção `## Duração` da `descricao.md`, copiado como está, sem recalcular.
- **Marcadores**: escreva exatamente `{{nome_do_aluno}}` e `{{link_do_curso}}`, com chaves duplas. Nunca invente um link nem um nome de aluno.
- O nome do curso vem de `nome-do-curso:` do `aula-pronta.config`.
- **Sem plataforma**: nenhum nome de plataforma de venda ou de e-mail.
- **Dado sensível vence tudo.** Nunca escreva o valor de um dado sensível (senha, chave, token, e-mail de pessoa, telefone, CPF, IP real, nome de máquina) no e-mail. Se o `material.md` ou a `descricao.md` tem algum, deixe fora. O tipo do dado vai **só no relatório**, nunca no arquivo do e-mail: nem a palavra "senha" nem um aviso dentro dele.

## Relatório ao infoprodutor

Sua última mensagem, em português simples:

1. **Arquivo**: o caminho de `lotes/lote-….md` e as aulas, na ordem de assistir.
2. **Marcadores**: avise que `{{nome_do_aluno}}` e `{{link_do_curso}}` ficam para ele preencher na ferramenta de e-mail.
3. **Envio**: diga que o aula-pronta não envia nada: ele copia o texto e envia por conta própria.
4. **Dado sensível**: se o material ou a descrição tinha algum, diga o tipo (nunca o valor) e que você o deixou fora do e-mail. Nenhum: omita esta parte.
5. **Próximo passo**: ler o e-mail e ajustar o que quiser.

No relatório e em toda a conversa, nunca escreva o valor de um dado sensível.
