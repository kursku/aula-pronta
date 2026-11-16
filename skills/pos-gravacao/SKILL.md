---
name: pos-gravacao
description: Transforma o arquivo SRT da gravação de uma aula na transcrição e escreve o material do aluno em texto e a descrição da aula, com relatório das falas corrigidas. Use quando o infoprodutor pedir o material do aluno ou a descrição de uma aula, disser que gravou uma aula ou passar o arquivo SRT dela.
argument-hint: aulas/01-nome-da-aula
allowed-tools: Read Write Bash(node:*)
---

# Pós-gravação: material do aluno e descrição da aula

Você fala com um infoprodutor que não é programador: escreva em português simples, sem jargão, e use só os termos do glossário (aula, gravação, transcrição, material do aluno, descrição da aula, aluno, lote).

**A gravação é a fonte de verdade.** Não há roteiro. O material descreve o que foi dito e mostrado, não o que foi planejado. Você nunca envia nada a ninguém.

## Qual aula

A aula vem em `$ARGUMENTS`: a subpasta da aula, como `aulas/01-luz-e-agua`. Antes de tudo, acerte o caminho:

1. Sem argumento: pergunte qual aula e pare.
2. O nome sozinho (`01-luz-e-agua`) vira `aulas/01-luz-e-agua`.
3. Se o infoprodutor passou um arquivo (como `aulas/01-luz-e-agua/gravacao.srt`), use a pasta dele.
4. Só trabalhe dentro de `aulas/` da pasta atual: recuse caminho com `..` ou fora dela.
5. Se o nome da pasta tem aspas simples (`'`), pare e peça para renomear a pasta sem elas.

**Número da aula** = prefixo do nome da pasta (o que vem antes do primeiro `-`), sem zeros à esquerda: `01-…` é a aula 1, `10-…` é a 10. Aula com partes tem decimal em **todas**, a primeira inclusive: `02.1-…` é a aula 2.1, `02.2-…` é a 2.2. Nunca renumere nem invente número. Se a pasta não tem prefixo numérico, ou o prefixo é só zeros (`00-…`, que daria número vazio), **pare** e peça para renomear a pasta com o número certo da aula (como `03-luz-extra`) e rodar o comando de novo.

## Passo 1: o que escrever

Confira com `Read` (nunca `Glob`), um arquivo de cada vez. Só o erro de "arquivo não existe" significa que o arquivo não existe. Qualquer outro erro (sem permissão, arquivo bloqueado, pasta no lugar do arquivo): conte o erro ao infoprodutor e **pare**; nunca trate como arquivo ausente.

Confira, antes de gerar ou ler a transcrição, se `<pasta>/material.md` e `<pasta>/descricao.md` existem. O material e a descrição são independentes:

- **Os dois existem**: pergunte ao infoprodutor se quer sobrescrever cada um e **pare, sem rodar o script, sem ler nem gerar a transcrição e sem escrever nada**. Só sobrescreva depois do "sim".
- **Falta o `material.md`**: escreva-o (Passos 2 a 5) e grave a descrição, se ela faltar (Passo 6). Se a `descricao.md` já existe, ela fica como está: deixe a pergunta sobre sobrescrevê-la para o fim.
- **O `material.md` já existe e falta a `descricao.md`**: **não pergunte nada sobre o material e não o reescreva**. Leia o `material.md`: se ele não tem um título (`# …`) ou não tem texto depois do título, **pare** e explique que a descrição precisa desse conteúdo, sem inventar nada nem escrever nada. Com título e texto, rode o Passo 2, pule os Passos 3 a 5 e grave só a descrição (Passo 6).
- **Um arquivo que já existe não se sobrescreve sozinho**: só sobrescreva depois do "sim".

## Passo 2: a transcrição

Mesma regra de erro do Passo 1: só "arquivo não existe" significa ausente; qualquer outro erro, conte e **pare**.

1. Se `<pasta>/transcricao.md` existe, use-a. **Não gere de novo e nunca edite**: ela é a cópia fiel da gravação. Ela só serve se tem a linha `# Transcrição` e uma linha `Duração:`; senão é de outro formato (antiga ou escrita à mão): **pare** e explique que ela não serve, sem apagar nada.
2. Se não existe, leia `<pasta>/gravacao.srt`.
   - Sem `gravacao.srt`: **pare**, sem criar nada. Explique que falta salvar o SRT da aula na pasta dela com o nome `gravacao.srt` (o CapCut, o YouTube e a plataforma do curso exportam esse arquivo).
   - Com `gravacao.srt`, rode:

     ```
     node '${CLAUDE_SKILL_DIR}/scripts/srt-para-transcricao.mjs' '<pasta>/gravacao.srt' '<pasta>/transcricao.md'
     ```

     Os caminhos vão entre aspas simples, para `$` ou crase no nome da pasta não serem expandidos.

     Se o `node` não existir ou a ferramenta for recusada, **pare** e diga que o aula-pronta precisa do Node.js (nodejs.org). Não converta à mão. Se o script reclamar de outra coisa, conte o motivo em português.

A transcrição tem `# Transcrição`, a linha `Duração: mm:ss` e uma linha `[mm:ss] fala` por trecho (`h:mm:ss` a partir de 1 hora).

## Passo 3: ler tudo

Leia `transcricao.md` **inteira**, do primeiro ao último trecho (em partes com `offset` e `limit`, se for grande). Só siga quando tiver lido até o fim.

## Passo 4: separar (isto vai para o relatório, não para o material)

- **Falas tecnicamente erradas**: o minuto `[mm:ss]`, o que foi dito e a versão correta. Só entra o que é errado de fato, verificável. Na dúvida, não corrija no material e leve para "Decisões para confirmar".
- **Dados sensíveis**, ditos ou mostrados: senha, chave, token, e-mail, telefone, CPF, IP real, nome de máquina. Anote o minuto e o **tipo**, nunca o valor.
- **Preços e limites** citados.
- **Anunciado e não gravado**: fica fora do material.

## Passo 5: escrever `material.md`

**Dado sensível vence tudo.** Esta regra tem prioridade sobre "o que foi dito", "como foi dito" e "os endereços citados". Nunca escreva o valor de um dado sensível no material, em nenhum bloco, comando, prompt, link, fala corrigida ou exemplo. Se a fala errada, o comando, o prompt ou o link contém o dado, descreva sem o valor ou use um valor fictício (e-mail `seu-email@example.com`, IP `192.0.2.10`).

Crie com `Write` (só se o Passo 1 mandou escrever o material). Use exatamente estes títulos, nesta ordem. Todos estão sempre presentes, **menos** `### Resultado esperado`, que só entra depois de uma demonstração:

````
# Aula N: Título da aula

## Para quem é
(2 frases: quem já assistiu à Aula N e o que o material entrega)

## Parte 1: um conceito
(texto; tabela quando comparar coisas)

### Resultado esperado
(só depois de uma demonstração: o que o aluno deve ver se fez certo)

## Parte 2: outro conceito

## Prompt de bolso
```
(prompt curto para colar numa IA e aplicar a aula ao caso do aluno)
```

## Tarefa

## Checklist
- [ ] (algo que o aluno confere que já sabe fazer)

## Links

## Referência rápida
| Pergunta | Onde ver |
|---|---|
| ... | Parte 1 |
````

Regras do conteúdo:

- Uma parte por conceito, na ordem da gravação. Quantas partes a aula tiver.
- Termo técnico com o nome certo e, logo depois, uma explicação curta para o aluno leigo.
- Comando, prompt ou texto mostrado na aula vai em bloco de código, copiável, como foi dito (salvo o que a regra do dado sensível proíbe).
- `### Resultado esperado` depois de cada demonstração.
- Prompt de bolso: use o prompt que a aula mostrou; se não mostrou, escreva um com base só no que a aula ensinou. Tarefa: a que a aula pediu; se não pediu, uma curta, do que foi ensinado.
- Links: os endereços citados. Sem nenhum, escreva "Esta aula não citou links."
- **Preço ou limite** citado: **cada** valor em dinheiro (um por um, mesmo que a aula cite vários) e cada limite leva a data de hoje **na mesma linha**, assim: "R$ 89 (valor dito na aula; registrado em DD/MM/AAAA, confira se mudou)". Sem preço, nada.
- **Fala errada**: escreva só a versão correta, como se tivesse sido dita assim. Não use "erro", "na verdade", "corrigindo", não diga que a aula falou diferente e não aproveite explicação ou analogia que dependa da fala errada.
- **Dado sensível**: veja a regra no começo deste passo. Se a demonstração depende dele, escreva "entre com o seu e-mail e a sua senha".
- Escreva só o que foi gravado.

## Passo 6: escrever `descricao.md`

Só se `descricao.md` não existia (ou o infoprodutor já disse "sim" para sobrescrever). A **fonte do texto é o `material.md`**, o que você acabou de escrever ou o que já estava na pasta (leia-o inteiro com `Read` se não o escreveu agora): ele já traz a fala corrigida e não tem dado sensível. **Não copie nada direto da transcrição.** Dela vem só a duração. A regra do dado sensível do Passo 5 vale aqui também: se o `material.md` (escrito ou editado à mão) tem algum, não o copie para a descrição e anote o **tipo**, nunca o valor, para o relatório.

Crie com `Write`. Use exatamente estes títulos, nesta ordem, e só eles:

````
# Descrição da aula N

## Título
(título da aula, sem o "Aula …:" do começo)

## Descrição curta
(1 ou 2 frases, até 160 caracteres)

## Descrição completa
(1 parágrafo sobre o que a aula resolve e para quem é)

Você vai ver:
- (3 a 6 itens, cada um um assunto ou uma demonstração da aula)

## Duração
mm:ss
````

- `N` é o número da aula, tirado do prefixo da pasta.
- **Duração**: o valor da linha `Duração:` da `transcricao.md` que você conferiu no Passo 2, copiado como está (por exemplo `10:32`), sem recalcular nem converter.
- **A descrição serve a qualquer plataforma.** Nenhum nome de plataforma de venda ou de curso, e nenhum campo de uma plataforma específica (como tag, categoria, slug ou texto para busca). Se o material cita uma plataforma, deixe o nome fora.
- Escreva só o que o material ensina, em português simples. Sem preço nem limite: eles ficam no material, com data.

## Passo 7: relatório ao infoprodutor

Sua última mensagem, em português simples, nesta ordem:

1. **Arquivos**: `transcricao.md` (criada agora ou já existia), `material.md` e `descricao.md`. Diga o que gravou agora e o que já existia e você não tocou. Pergunte se quer sobrescrever **só** o arquivo que você foi impedido de escrever porque já existia (a `descricao.md`, quando você escreveu o material). Material pronto com a descrição faltando não pede pergunta nenhuma.
2. **Falas corrigidas** (só se escreveu o material agora; se o material já existia, escreva "O material já existia: as falas não foram revisadas agora, então não há relatório de falas corrigidas desta vez"): uma linha por fala, `[mm:ss]` + o que foi dito + o que o material diz. Nenhuma: escreva "Nenhuma".
3. **Dados sensíveis**: `[mm:ss]` + o tipo, e a frase "não coloquei no material nem neste relatório". Avise que `transcricao.md` (e o `gravacao.srt` de onde ela vem) é cópia fiel da gravação e guarda esse trecho: não compartilhe nem publique esses arquivos. O `iniciar` já deixa `transcricao.md` e `gravacao.srt` fora do Git; quem criou a pasta antes dessa versão deve rodar o `iniciar` de novo. Se o `material.md` que já existia tem dado sensível, diga o tipo (nunca o valor) e que a descrição o deixou de fora. Nenhum: omita esta parte.
4. **Preços e limites citados**: o valor e a data registrada. Nenhum: omita.
5. **Decisões para confirmar**: dúvidas que sobraram. Nenhuma: omita.
6. **Próximo passo**: ler o `material.md` e a `descricao.md` e ajustar o que quiser. Para a página web e o PDF do material, rode `/aula-pronta:pagina-pdf` com a pasta da aula. Para avisar os alunos de um lote de aulas, rode `/aula-pronta:lote` com os nomes das pastas das aulas. Se a aula for regravada, apague a `transcricao.md` dela e rode o comando de novo, senão ele reaproveita a transcrição antiga.

No relatório e em toda a conversa, nunca escreva o valor de um dado sensível.
