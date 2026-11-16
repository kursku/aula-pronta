# Regras da wiki do curso

Este arquivo é lido pelo Claude antes de cada operação na wiki. O aula-pronta o cria uma vez e não o sobrescreve: se você quiser acrescentar uma regra sua, escreva no fim, em "Regras do infoprodutor".

A ideia de uma wiki mantida por um modelo, em vez de uma busca nos textos a cada pergunta, vem do gist "LLM Wiki" de Andrej Karpathy (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Esta implementação é própria do aula-pronta, escrita do zero.

## Três camadas

1. **Transcrições originais** em `raw/<aula>/transcricao.md`: cópia exata da transcrição da aula. Ninguém edita, nem o Claude. O hash de cada uma fica no registro.
2. **Páginas** em `aulas/` e `conceitos/`, mais `indice.md`: mantidas pelo Claude, sempre a partir das transcrições. Se uma página diverge da transcrição, a transcrição vale.
3. **Estas regras.**

`raw/` guarda tudo o que foi dito na gravação, **inclusive dado sensível**. O nome `transcricao.md` já é ignorado pelo Git (o `iniciar` cuida disso): não compartilhe nem publique esta pasta.

## Regras que valem sempre

- **A gravação é a fonte de verdade.** Escreva o que foi dito, com o minuto, sem corrigir nem comentar o que parece errado. Comparar aulas é trabalho da verificação, não da ingestão.
- **Dado sensível nunca entra numa página** (senha, chave, e-mail ou telefone de pessoa, CPF, IP real, nome de máquina). Nem no resumo, nem nas afirmações, nem nos nomes. Se a aula mostra um, escreva só que ela mostra um login, sem o valor.
- **Minuto sempre no formato da transcrição**: `[mm:ss]`, ou `[h:mm:ss]` a partir de 1 hora.
- **Links são relativos e levam a um arquivo que existe**, com `.md` no fim. **Codifique cada parte do endereço como em uma URL**: espaço vira `%20`, `%` vira `%25`, `#` vira `%23`, `(` e `)` viram `%28` e `%29`. A pasta `03-luz extra` fica `../raw/03-luz%20extra/transcricao.md`. Sem isso o link quebra ou o conferir não o enxerga.
- **Cada página de aula leva o nome da pasta da aula** (`aulas/04-adubando-a-horta.md`). O número da aula é o prefixo da pasta, sem zeros à esquerda (`04-…` é a aula 4, `02.1-…` é a 2.1).
- **O cabeçalho das páginas** é o bloco entre `---` no começo, uma linha `chave: valor` por campo, sem aspas e sem quebra de linha. O índice é feito a partir dele.
- `indice.md` e `registro.md` são escritos pelo comando de ingestão. Não os edite.

## Página de aula: `aulas/<pasta-da-aula>.md`

```
---
tipo: aula
numero: 4
transcricao-sha256: 64 caracteres, o "sha256" que o comando copiar devolveu
modulo: Adubação
duracao: 03:43
titulo: Adubando a horta
resumo: Uma frase: o que a aula resolve.
---

# Aula 4: Adubando a horta

Transcrição original: [transcricao.md](../raw/04-adubando-a-horta/transcricao.md)

## Resumo
(3 a 5 frases com o que foi dito)

## Conceitos que ensina
- [Adubo orgânico](../conceitos/adubo-organico.md) [00:55]: uma frase do que a aula ensina sobre ele

## Conceitos que só cita
- [Composto](../conceitos/composto.md) [01:11]: como aparece na fala

## Demonstrações
- [02:03] O que foi mostrado. Resultado esperado: o que o aluno vê se fez certo.

## Afirmações
- [01:35] [Frequência da adubação](../conceitos/frequencia-da-adubacao.md): "adubar a cada quinze dias"
```

- `transcricao-sha256` diz de qual transcrição a página saiu: é o `sha256` que `copiar` devolve (o mesmo do registro). **Sem ele, ou com um hash que não é o da cópia em `raw/`, o `registrar` recusa a aula e o `conferir` aponta a página.** Se a transcrição foi trocada (`--substituir`), reescreva a página e ponha o hash novo.
- `duracao` é a da linha `Duração:` da transcrição, copiada como está.
- `modulo` é o tema do grupo de aulas, proposto por você. **Reaproveite um módulo que já está no índice** quando o tema serve; crie um novo só quando nenhum serve.
- **Conceito que ensina**: a aula explica o conceito, dá a definição ou mostra como fazer. **Conceito que só cita**: a aula menciona ou se apoia nele sem explicá-lo. Em dúvida, é "só cita".
- **Afirmações**: o que a aula afirma e que pode ser conferido ou contrariado por outra aula (números, prazos, quantidades, regras, recomendações), com o minuto e o conceito a que se refere.
- Seção sem itens (sem demonstração, sem conceito que só cita, sem afirmação) leva "Nenhuma." ou "Nenhum.", nunca fica vazia.

## Página de conceito: `conceitos/<nome-sem-acento-e-com-hifens>.md`

```
---
tipo: conceito
nome: Adubo orgânico
definicao: Uma frase, como o curso ensina (se as aulas divergem, o valor de cada uma).
---

# Adubo orgânico

## Definição
Como o curso ensina, com a aula e o minuto (Aula 4, [00:30]). Se as aulas divergem, veja a regra abaixo.

## Aulas onde aparece
- [Aula 4: Adubando a horta](../aulas/04-adubando-a-horta.md) [00:55]: ensina
- [Aula 5: Folhas amarelas e pragas](../aulas/05-folhas-amarelas-e-pragas.md) [00:30]: cita

## Avisos de contradição
Nenhum aviso.
```

- **Um conceito é uma ideia que o curso ensina e que pode aparecer em mais de uma aula.** Não faça página para qualquer substantivo: de 3 a 7 conceitos que a aula ensina e de 0 a 4 que ela só cita é o normal.
- **Antes de criar um conceito, procure no índice** o mesmo assunto com outro nome e use a página que existe.
- Nome do arquivo: o nome do conceito em minúsculas, sem acento, com hifens (`Adubo orgânico` vira `adubo-organico.md`).
- Em `## Aulas onde aparece` (título exatamente assim, sem mais nada), um item por aula, começando em `- ` **na primeira coluna** (sub-item ou continuação recuados andam junto com o item da aula, no `indice` e no `limpar-conceitos`), **na ordem dos números das aulas**, terminando em `: ensina` ou `: cita`. Se o conceito aparece mais de uma vez na aula, vale o primeiro minuto. O comando `indice` põe essas linhas em ordem se alguma ficou fora do lugar.
- **Conceito que nenhuma aula ensina** (só linhas `: cita`): em `definicao` e em `## Definição` escreva exatamente "Nenhuma aula ensina este conceito." Quando uma aula nova o ensinar, troque pela definição e a linha dela para `: ensina`.
- **Quando as aulas divergem sobre o conceito** (uma manda adubar a cada quinze dias, outra uma vez por mês), `definicao` e `## Definição` trazem **o valor de cada aula, com a aula e o minuto**, sem escolher um deles e sem dizer que uma corrige ou revoga a outra. Exemplo de `definicao`: `Aula 4 [01:28]: adubar a cada quinze dias. Aula 5 [00:36]: adubar uma vez por mês.` Decidir qual vale, ou apontar a contradição, é da verificação da wiki: a ingestão só deixa os dois valores à vista.
- **`## Avisos de contradição`** é escrito pela verificação da wiki, e só por ela. A ingestão deixa "Nenhum aviso." na página nova, nunca julga contradição e não mexe na seção de uma página que já existe. A verificação reescreve a seção inteira a cada rodada, com uma linha por contradição: `- [Aula 4](../aulas/04-adubando-a-horta.md) [01:28] diz a cada quinze dias; [Aula 5](../aulas/05-folhas-amarelas-e-pragas.md) [00:36] diz uma vez por mês.` (as duas aulas com link, os dois minutos e os dois valores). A reingestão **não apaga** as linhas de aviso (o `limpar-conceitos` ignora a seção): um aviso desatualizado sai na próxima verificação. Conceito sem contradição fica com "Nenhum aviso." Decidir qual aula vale e corrigir o conteúdo continua sendo do infoprodutor.

## Operações

- **Ingerir** (`/aula-pronta:wiki-do-curso ingerir`): processa só as aulas que o registro ainda não tem. Com mais de 5 aulas novas, trabalha em blocos de 5: copia as transcrições, escreve as páginas, registra e refaz o índice antes de começar o bloco seguinte. Ingerir uma aula é repetível: reingerir (uma rodada interrompida, uma aula regravada) refaz as páginas dela e troca as linhas dela nos conceitos, sem duplicar.
- **Consultar** (`/aula-pronta:wiki-do-curso consultar <pergunta>`): responde "já falei de X?" **só lendo**: abre o índice, as páginas certas e confere o minuto na transcrição, e cita aula e minuto em cada afirmação. Não escreve nada na wiki. Se não está na wiki, diz isso, sem palpite nem conhecimento geral. Conceito com aviso de contradição sai com as duas aulas e os dois minutos, sem escolher um lado; conceito citado e nunca ensinado sai com onde aparece e a frase de que nenhuma aula o ensina.
- **Verificar** (`/aula-pronta:wiki-do-curso verificar`): relata tudo e grava só a seção `## Avisos de contradição` das páginas de conceito; não corrige mais nada. A parte mecânica (links quebrados, páginas soltas, citação só de um lado, lacunas) é feita pelo próprio Claude com `Glob`, `Grep` e `Read`, sem script. A parte de leitura compara o que as aulas afirmam sobre o mesmo conceito e aponta cada contradição com as duas aulas e os dois minutos; diferença de contexto não é contradição. Página solta é a que nenhuma outra página de aula ou de conceito liga: o `indice.md` e o `registro.md` não contam.
- **Escopo** (`/aula-pronta:escopo-do-curso`): outra skill, que só lê a wiki e grava `wiki/escopo.md` (mapa de módulos, lacunas, ordem de assistir e próximas aulas a gravar). O arquivo é refeito inteiro a cada execução: não o edite à mão, a próxima execução o apaga. Ele não é página de aula nem de conceito e não entra no `indice.md`.

## Regras do infoprodutor

(Escreva aqui o que quiser acrescentar.)
