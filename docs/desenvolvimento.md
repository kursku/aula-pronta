# Desenvolvimento do plugin

Para quem mexe no código do aula-pronta: testes sem modelo, suíte do `claude plugin eval` e como rodar no WSL. Quem só usa o plugin não precisa disto: veja o [README](../README.md).

## Testes (`claude plugin eval`)

A suíte fica em [`evals/`](../evals). Cada pasta é um caso:

```
evals/<caso>/
├── prompt.md          # o que se pede ao Claude (frontmatter: modelo, runs, limites)
├── case.yaml          # opcional: context.scaffold_script monta a pasta de partida
├── preparar-pasta.sh  # o scaffold_script do caso
└── graders/*.md       # uma verificação por arquivo (file_exists, regex, tool_used...)
```

Rodar tudo, a partir da raiz do repositório:

```
claude plugin eval . --allow-tools Write Edit WebFetch --scaffold --ablation none
```

- `--scaffold` deixa rodar o `preparar-pasta.sh` dos casos (só use em suítes que você escreveu).
- `--allow-tools Write Edit WebFetch` libera a escrita, que o `iniciar` precisa, e a rede (`WebFetch`), para os casos do `lote` provarem que nada é enviado: o grader `tool_used` com `max: 0` só vale se a tool estava disponível. Listar `Write` em `allowed_tools` no `prompt.md` não basta: sem a flag a tool é retirada da rodada.
- Suítes que usam `Bash` rodam no WSL no Windows: o sandbox do Windows recusa `Bash` e a rodada falha. Por isso os casos que precisam de `Bash` ficam separados em [`evals-wsl/`](../evals-wsl) e os de `evals/` não usam `Bash`. No Windows o `Bash` nem é concedido ao eval, então um grader `Bash` com `max: 0` ali não prova nada.
- `--ablation none` roda só com o plugin. O padrão compara com uma rodada sem plugin, que não faz sentido aqui e dobra o custo.
- Na primeira vez num diretório novo, o Claude pergunta se você confia no plugin; em CI use `--trust-plugin`.
- Cada rodada é uma chamada de modelo na sua conta e consome o uso do seu plano. Custo medido: os 17 casos `gitignore-*` custam cerca de US$ 2,50; a suíte inteira passa de US$ 5. Use `--max-cost-usd` e rode só o caso que você mexeu (`--case`).
- Um caso só: `--case rodar-de-novo`. Relatório em `evals/results/<data>/report.html` (fora do git).

Casos do `.gitignore` do `iniciar` (`gitignore-*`): o `.gitignore` que já existe é lido pelo efeito final das regras, por julgamento do modelo, sem script. Os casos de borda rodam 3 vezes (`runs: 3`) e só passam se todas as rodadas passarem: `gitignore-espaco-no-comeco`, `gitignore-regra-de-pasta`, `gitignore-modelo-production-example`, `gitignore-negacao-fora-da-lista`, `gitignore-crlf-com-negacao` e `gitignore-ancora-repetida`. Os graders leem o `.gitignore` depois da rodada e conferem: as linhas do usuário ficam intactas; o `.env` e o `.env.*` terminam ignorados no trecho acrescentado (aceitam `.env`, `/.env`, `**/.env`, `.env*`; `.env.*`, `/.env.*`, `**/.env.*`, `.env*`); depois das linhas originais só entra `!` de modelo (nome com `example`, `sample` ou `template`), e `transcricao.md` e `gravacao.srt` não são liberados; nos casos `crlf` e `ancora`, `transcricao.md` e `gravacao.srt` aparecem no arquivo. Os graders não fixam a redação nem a ordem, e não executam o `git`: leem as regras. `gitignore-crlf-com-negacao` guarda o CRLF das linhas acrescentadas: o grader `fim-de-linha-continua-crlf` reprova qualquer LF solto no arquivo final (o `Edit` preserva o CRLF sozinho; um `Write` que reescreva o arquivo ou uma linha LF solta reprova). Como o `Read` esconde o CR, a regra de CRLF do `SKILL.md` não é testável só com `Read`, `Write` e `Edit`: o caso guarda o comportamento do `Edit`, não essa regra. `gitignore-ancora-repetida` não força o erro de âncora do `Edit`: o modelo pode escolher a âncora certa de primeira.

Casos do `pos-gravacao` em `evals/` (o `preparar-pasta.sh` copia o curso de exemplo e já gera a transcrição com o script do plugin, então a skill não precisa de `Bash`): `material-aula-unica` (seções, fala corrigida, dado sensível ausente, minutos no relatório), `material-aula-com-partes` (aula 2.1), `material-ja-existe` (material e descrição já existem: não sobrescreve e pergunta), `sem-gravacao` (para sem criar nada) e `descricao-aula` (material pronto, grava só a `descricao.md`).

Casos do `lote` em `evals/`: `lote-duas-aulas` (aulas passadas fora de ordem, um só arquivo em `lotes/`), `lote-sem-descricao` (para sem escrever nada) e `lote-pedido-de-envio` (pedido de envio: grava só o texto e diz que não envia). No Windows o `Bash` não pode ser concedido ao eval, então "nenhum `Bash`" nesses casos não prova nada ali; a prova de que nada é enviado é o `WebFetch` em 0 chamadas, a ausência de qualquer tool de envio e o `allowed-tools: Read Write` da skill (conferido por `node --test skills/lote/scripts/allowed-tools.test.mjs`).

**Rodar no WSL** os casos de `evals-wsl/`: `converter-srt` (a skill converte o SRT sozinha), `transcrever-sem-chave`, `transcrever-custo-antes` e `transcrever-servico-falha` (a skill de transcrever, que nesses três casos **não chama o Groq**) e `pagina-web` (a skill gera a página web do material com a marca do curso, texto cru escapado e o mesmo conteúdo). O Chrome **não roda** dentro do sandbox do eval (`socket() failed: Operation not permitted`), então o eval cobre a página web e o PDF é provado por um teste ponta a ponta fora do sandbox, no Windows, com `claude -p` e `--plugin-dir`. Testado como root, no Ubuntu 26.04, com o Claude Code 2.1.318 instalado dentro do WSL:

```
sudo apt-get update && sudo apt-get install -y nodejs bubblewrap socat
curl -fsSL https://claude.ai/install.sh | bash   # o Claude Code do Windows não serve aqui
export PATH="$HOME/.local/bin:$PATH"
which claude                                     # precisa mostrar ~/.local/bin/claude, não /mnt/c/...
claude auth login                                # login próprio do WSL, separado do Windows
cp -r /mnt/c/<caminho>/aula-pronta ~/aula-pronta && cd ~/aula-pronta
sudo mkdir -p /opt/ap-eval-tmp && sudo chown "$USER" /opt/ap-eval-tmp
TMPDIR=/opt/ap-eval-tmp claude plugin eval . --eval-dir evals-wsl --allow-tools Write Edit Bash --scaffold --ablation none --trust-plugin
```

- A cópia fica fora de `/mnt/c` e de `/tmp`: o sandbox do eval bloqueia a leitura de `/mnt/c` e a escrita em `/tmp`.
- Com o `TMPDIR` padrão (`/tmp`), o script da skill falhou com `EROFS: read-only file system` ao gravar na pasta da aula. Com `/opt/ap-eval-tmp`, o caso passou.
- O relatório fica em `evals-wsl/results/<data>/report.html`.

No Windows, o mesmo `claude plugin eval` com `Bash` termina com "A shell tool (Bash or PowerShell) was granted but this machine cannot confine it": a rodada é recusada, sem custo.

Casos da wiki do curso, também em `evals-wsl/` porque o `wiki-do-curso` roda o script com `Bash` (a cópia fiel das transcrições não pode passar por `Write`). Cada caso monta a pasta com as transcrições já geradas:

- `wiki-tres-aulas`: as aulas 3 a 5 e a wiki vazia. Confere as três transcrições copiadas sem alteração (o texto inteiro), as páginas de aula (com o hash da transcrição no cabeçalho) e de conceito, os links nos dois sentidos, o índice, o registro (o hash da transcrição de verdade, data e bloco 1), que a frequência da adubação traga os dois valores (aulas 4 e 5) sem escolher um, o arquivo de regras e que o telefone dito na aula 5 não aparece em nenhuma página.
- `wiki-quarta-aula`: as aulas 3 a 5 já ingeridas (bloco 1, `2026-11-01`) e a aula 6 nova, de [`evals-fixtures/quarta-aula/`](../evals-fixtures/quarta-aula) (as páginas prontas estão em [`evals-fixtures/wiki-tres-aulas/`](../evals-fixtures/wiki-tres-aulas)). Confere que só a aula 6 é copiada e registrada (bloco 2) e que as linhas do registro e as páginas das outras três ficam como estavam.
- `wiki-em-blocos`: as seis aulas do curso de exemplo, acima do limite de 5. Confere que o registro tem as cinco primeiras no bloco 1 e a sexta no bloco 2, em duas chamadas de `registrar`, com o hash exato de cada transcrição, e que `indice` e `conferir` saiam do próprio script (`node …/wiki.mjs <comando>`), não de um `cat wiki/indice.md`.

Casos de **verificar a wiki** (`verificar-*`): o achado está na mensagem final, que os casos conferem com `regex` no `last_message` (o minuto de cada aula e o nome do conceito, da página e do link, sempre juntos no mesmo achado) e com `llm` (só o que o `regex` não alcança: "só uma contradição", "não inventou achado"). O que a verificação grava, a seção de avisos, é conferido no arquivo, lido depois da rodada. Também provam o que ela **não** faz: `Write` em 0 chamadas, `Edit` só em páginas de conceito (as duas tools estão liberadas no caso, então o 0 vale), e o texto de cada conceito até `## Avisos de contradição`, as páginas de aula e os arquivos plantados, lidos depois da rodada, continuam como estavam. Link quebrado, página solta e citação de um lado só são plantados **só na cópia da wiki do caso** (o `preparar-pasta.sh`), nunca no curso de exemplo.

- `verificar-contradicao-e-lacuna`: a wiki do exemplo (aulas 3 a 5). Acha a frequência da adubação (aula 4 em `[01:28]`, aula 5 em `[00:36]`) e o composto (citado em `[01:04]` e `[02:24]`, nunca ensinado), e não inventa link quebrado nem página solta.
- `verificar-link-e-pagina-solta`: a aula 3 ganha um link para `rega-inicial.md`, que não existe, e a wiki ganha o conceito Vermiculita, que está no índice mas nenhuma página liga.
- `verificar-citacao-so-de-um-lado`: o Húmus de minhoca perde a linha da aula 5 (que o cita) e a aula 5 perde o Excesso de adubo (que a lista).
- `verificar-aviso-ja-gravado`: a wiki do primeiro caso, mas já com o aviso da frequência da adubação gravado (com outras palavras) e um aviso velho no Excesso de adubo, que não tem contradição. Depois da rodada o aviso certo aparece uma vez só, o velho saiu (a seção voltou a "Nenhum aviso."), o resto dos conceitos e as páginas de aula não mudaram, e o relatório diz quais páginas perderam o aviso.
- `verificar-wiki-limpa` (caso negativo): duas aulas fictícias sem problema, com regras de rega diferentes para alface e tomate (contexto, não contradição). Não pode apontar nada e precisa dizer que não achou.
- `evals-wsl/verificar-sem-script`: o mesmo curso do primeiro caso, com o `Bash` liberado, para o "sem script" valer: nenhuma chamada ao `wiki.mjs` nem ao `node`, e nenhuma escrita na wiki pelo shell. No Windows o `Bash` não pode ser concedido, então esse zero só prova algo no WSL; lá o que se prova é que a skill usou `Grep` e `Glob`.

Casos de **consultar a wiki** (`consultar-*`, a wiki do exemplo das aulas 3 a 5; a resposta é a última mensagem, conferida com `regex` no `last_message`). Todos provam que **nada foi escrito**: `Write` e `Edit` em 0 chamadas (as duas tools estão liberadas no caso, então o 0 vale) e, lidos depois da rodada, o `indice.md`, o `registro.md`, as páginas das aulas 4 e 5 e os conceitos Frequência da adubação e Composto continuam exatamente como o `preparar-pasta.sh` os deixou.

- `consultar-conceito-presente`: calda de sabão, a aula 5 em `[01:20]` e a receita, sem apontar outra aula.
- `consultar-assunto-ausente`: poda, que nenhuma aula ingerida ensina. Diz que não está na wiki e **não tem `Aula N` nem `[mm:ss]`**, nem palpite, nem conhecimento geral sobre poda.
- `consultar-contradicao`: "de quanto em quanto tempo eu adubo?" com o aviso já gravado: as aulas 4 (`01:28`) e 5 (`00:36`), os dois valores, e nenhuma escolha de lado. `consultar-contradicao-sem-aviso`: o mesmo sem o aviso gravado (só a definição do conceito traz os dois valores).
- `consultar-outras-palavras`: pergunta sem o nome do conceito (a Inspeção da horta, aula 5 em `02:24`, duas vezes por semana), sem confundir com a frequência da adubação.
- `consultar-lacuna-composto`: composto citado na aula 4 (`01:04`) e na aula 5 (`02:24`), nenhuma aula o ensina, sem explicar como se faz.
- `consultar-minuto-na-transcricao`: a página da aula e a do conceito trazem `[01:50]` (plantado só na cópia), a transcrição tem `[01:20]`: a resposta traz o da transcrição.
- `evals-wsl/consultar-sem-escrever`: o caso da contradição com o `Bash` liberado: nenhuma chamada ao `wiki.mjs` nem ao `node`, e nenhuma escrita na wiki pelo shell.

Casos do **escopo do curso** (`escopo-*`): o escopo é o arquivo `wiki/escopo.md`, conferido depois da rodada (as seções, os módulos, as aulas e a ordem por posição `1.`, `2.`...). Todos provam que **nada mais foi escrito**: `Edit` em 0 chamadas, `Write` só no caminho `<pasta>/wiki/escopo.md` (um `tool_used` com `input_match` no `file_path`, com `wiki` logo antes de `escopo.md`: `notas-escopo.md`, `wiki/rascunho/escopo.md`, `escopo.md.bak` e `escopo.md` fora de `wiki/` reprovam; testado em `write-grader.test.mjs`) e a quinta seção "Dados que não bateram" ausente e, lidos depois da rodada, o `indice.md`, o `registro.md` e as páginas de aula (no caso do exemplo também as 13 páginas de conceito) continuam exatamente como o `preparar-pasta.sh` os deixou.

- `escopo-do-exemplo`: as aulas 3 a 5 (cada próxima aula tem de ser a do composto: um grader de arquivo e um `llm` sobre a mensagem final). As quatro seções na ordem, o aviso no topo, os três módulos, o composto nas lacunas (`01:04` e `02:24`) e como próxima aula com o porquê, e a ordem 3, 4, 5 com a Aula 5 depois da 4 pelo húmus.
- `escopo-ordem-fora-da-numeracao`: a Aula 3 cita a Calda de sabão, que só a Aula 5 ensina. A ordem sai **4, 5, 3**, e a linha da Aula 3 diz por quê. Uma skill que ordena só pelo número da aula reprova.
- `escopo-ciclo`: a Aula 3 usa a Calda de sabão (ensinada na 5) e a Aula 5 usa a Muda (ensinada na 3). Só a Aula 4 ganha posição; as aulas 3 e 5 ficam em "Sem ordem possível", com os dois conceitos.
- `escopo-ciclo-com-professor`: a mesma wiki do ciclo, mas a Aula 4 também ensina a Muda. A Aula 5 fica pronta depois da 4 e a Aula 3 depois da 5: a ordem sai 4, 5, 3 e o documento **não** declara "Sem ordem possível".
- `escopo-dados-que-nao-bateram`: a Aula 5 lista a Muda em "só cita", mas a página da Muda não lista a Aula 5. A aula continua na ordem (3, 4, 5), sem usar a Muda como dependência, e o dado aparece em "Dados que não bateram", depois das quatro seções. Os outros casos exigem que essa seção **não** apareça sem dado.
- `escopo-segunda-execucao`: a wiki já tem a Aula 6 (módulo Colheita) e um `escopo.md` das aulas 3 a 5 com uma anotação escrita à mão sobre poda. O documento novo traz a Aula 6 no mapa e na ordem (posição 4), perdeu a anotação, tem uma cópia de cada seção, e a Aula 6 não vira lacuna.
- `escopo-wiki-vazia` (negativo): pasta sem índice nem aulas. Diz que o `ingerir` vem primeiro e **não existe** `wiki/escopo.md` depois (`Write` em 0).
- `evals-wsl/escopo-sem-script`: o caso do exemplo com o `Bash` liberado: nenhuma chamada ao `wiki.mjs` nem ao `node`, e nenhuma escrita na wiki pelo shell.

Os casos conferem arquivos, não o texto das respostas (a exceção são o minuto e o dado sensível no relatório final, conferidos com `regex` no `last_message`): o `file_exists` vê só arquivos criados na rodada, e o `regex` com `target: {source: file, path: ...}` lê o conteúdo de um arquivo que já existia.

Validar os manifestos sem gastar uso de modelo: `claude plugin validate . --strict`.
