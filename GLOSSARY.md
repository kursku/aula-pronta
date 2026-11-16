# aula-pronta

Plugin para infoprodutores: transforma as aulas gravadas de um curso em material pronto para o aluno e em conhecimento organizado sobre o curso.

## Pessoas

**Infoprodutor**:
Quem usa o plugin: cria e vende o curso, não é programador e já usa o Claude.
_Avoid_: criador, produtor, usuário, professor

**Aluno**:
Quem compra o curso do infoprodutor e recebe o material.
_Avoid_: cliente, comprador, membro

## Curso

**Curso**:
O produto do infoprodutor, formado por aulas gravadas.
_Avoid_: produto, programa, mentoria

**Aula**:
Uma unidade gravada do curso, com número próprio na plataforma onde o aluno assiste.
_Avoid_: vídeo, episódio, módulo

**Módulo**:
Um grupo de aulas do curso sobre o mesmo tema, na ordem em que o aluno deve assistir.
_Avoid_: trilha, seção, capítulo

**Conceito**:
Uma ideia que o curso ensina e que pode aparecer em mais de uma aula.
_Avoid_: tópico, assunto, tema

**Lacuna**:
Um conceito citado nas aulas que nenhuma aula ensina.
_Avoid_: gap, buraco, pendência

**Gravação**:
O vídeo da aula como foi gravado; é a fonte de verdade do que a aula ensina.
_Avoid_: vídeo, live

**Transcrição**:
O texto falado da gravação, com marcas de tempo.
_Avoid_: legenda, SRT

**Lote**:
O conjunto de aulas liberadas juntas e anunciadas num único e-mail ao aluno.
_Avoid_: lançamento, release, leva

## Entregas

**Material do aluno**:
O documento de apoio de uma aula, escrito a partir da gravação.
_Avoid_: apostila, resumo, PDF

**Descrição da aula**:
O texto que apresenta a aula ao aluno na plataforma onde o curso é vendido, sem campos de uma plataforma específica.
_Avoid_: sinopse, copy, descrição Lastlink

**Wiki do curso**:
A base de conhecimento interna do infoprodutor, montada a partir das transcrições, sobre o que o curso já ensina.
_Avoid_: base de conhecimento, FAQ, wiki do aluno

**Escopo do curso**:
O documento gerado a partir da wiki do curso, com o mapa de módulos, as lacunas, a ordem sugerida para o aluno assistir e as próximas aulas a gravar. É refeito a cada execução e não se edita à mão.
_Avoid_: plano do curso, roadmap, grade
