---
name: transcrever
description: Transcreve a gravação de uma aula (áudio ou vídeo) pelo Groq, com a chave do próprio infoprodutor, e grava a transcrição.md no mesmo formato do SRT. Use quando o infoprodutor não tem o SRT da aula e pedir para transcrever o áudio ou o vídeo.
argument-hint: aulas/01-nome-da-aula
allowed-tools: Read Bash(node:*)
---

# Transcrever pelo Groq

Você fala com um infoprodutor que não é programador: português simples, sem jargão, só os termos do glossário (aula, gravação, transcrição). Você nunca envia nada a ninguém.

Este caminho é opcional: quem já tem o SRT da aula (CapCut, YouTube, plataforma do curso) não precisa dele, e usa `/aula-pronta:pos-gravacao`. O Groq cobra por minuto de áudio, na conta do infoprodutor.

**A chave é segredo.** Nunca abra o `.env` com `Read` nem de outro jeito, nunca peça a chave no chat e nunca escreva o valor dela em lugar nenhum. Quem confere a chave é o script, que só diz se ela existe.

## Qual aula

A aula vem em `$ARGUMENTS`, como `aulas/01-luz-e-agua` (o nome sozinho vira `aulas/<nome>`; se passou o arquivo da gravação, use a pasta dele). Sem argumento: pergunte qual aula e pare. Só trabalhe em `aulas/` da pasta atual: recuse `..` e caminho fora dela. Nome de pasta com aspas simples (`'`): peça para renomear e pare.

A gravação é o arquivo `gravacao.mp4` (ou `.mp3`, `.m4a`, `.wav`, `.flac`, `.ogg`, `.webm`) na pasta da aula.

## Passo 1: conferir e estimar (nada é enviado)

```
node '${CLAUDE_SKILL_DIR}/scripts/transcrever-groq.mjs' '<pasta da aula>'
```

Com a pasta entre aspas simples. Sem `--transcrever`, o script só confere a chave e calcula o custo: não chama o Groq e não grava nada.

- **Sem chave** (o script explica como configurar e para): repita a explicação dele ao infoprodutor e **pare**. Nada é criado. Não crie o `.env` por ele nem peça a chave.
- **Já existe `transcricao.md`**: ela não é sobrescrita. Se a aula foi regravada, o infoprodutor apaga a `transcricao.md` e roda de novo. Pare.
- **Falta o ffmpeg** (o programa que mede e corta o áudio): explique, mostre o comando que o script deu e **pare**. Não instale nada.
- Qualquer outro erro do script: conte o motivo em português e pare. Se o `node` não existir, diga que o aula-pronta precisa do Node.js (nodejs.org).

## Passo 2: o custo, antes de qualquer envio

Diga ao infoprodutor, com as palavras do script, o **custo estimado** e que ele é cobrado pelo Groq. Se o script avisar que a gravação será enviada em várias partes, repita o aviso: uma falha no meio cobra de novo as partes já enviadas quando o infoprodutor rodar outra vez. Pergunte se pode transcrever e **espere o "sim"**. Sem "sim" claro, pare: nada foi enviado.

## Passo 3: transcrever (só depois do "sim")

```
node '${CLAUDE_SKILL_DIR}/scripts/transcrever-groq.mjs' '<pasta da aula>' --transcrever
```

O script mostra o custo de novo, corta a gravação em partes se ela passar do limite do Groq, repete sozinho uma falha temporária do serviço (até 3 vezes) e só grava a `transcricao.md` quando todas as partes deram certo. Se falhar, não deixa arquivo parcial.

- **O Groq recusou a chave** (401): o infoprodutor confere a chave no `.env`. Não repita o comando.
- **Outra falha** do script: conte o motivo em português. Falha temporária que esgotou as tentativas: sugira tentar de novo mais tarde.
- Nunca rode o Passo 3 duas vezes seguidas para "tentar de novo" sem o infoprodutor pedir: cada rodada cobra.

## Passo 4: relatório

Última mensagem, em português simples: onde ficou a `transcricao.md` e quantos trechos tem. Avise que a transcrição é cópia fiel da gravação e guarda tudo o que foi dito, inclusive dado sensível: não compartilhe nem publique (o `iniciar` já a deixa fora do Git). Próximo passo: `/aula-pronta:pos-gravacao` com a pasta da aula gera o material do aluno e a descrição a partir dela.

Se o infoprodutor quiser conferir o texto, ele lê a `transcricao.md`: a transcrição automática pode errar nomes próprios e termos técnicos.

No relatório e em toda a conversa, nunca escreva a chave nem o conteúdo do `.env`.
