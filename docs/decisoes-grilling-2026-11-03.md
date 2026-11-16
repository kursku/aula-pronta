# aula-pronta: decisões do grilling (03/11/2026)

Base para o `/to-spec`. Termos em `../GLOSSARY.md`.

## Produto

- Plugin do Claude Code para infoprodutores. Autoria e marca: Nick (Claude para Humanos).
- Público: infoprodutor leigo que já usa o Claude Code. Só PT-BR na v1.
- Exige o Claude Code. Desktop, Cowork e claude.ai ficam fora na v1, porque lá os scripts não rodam na máquina local.
- Repo novo e público na conta kursku, nome `aula-pronta`. O próprio repo é o marketplace. Licença MIT.

## Skills e ordem

| Versão | Entrega |
|---|---|
| v1 | `/aula-pronta:iniciar` + `pos-gravacao` |
| v2 | `transcrever` |
| v3 | `wiki-do-curso` + `escopo-do-curso` |
| depois | gerar roteiro e aulas |

## Decisões por tema

- **Fonte:** só a gravação, sem roteiro.
- **Pasta do curso** (criada por `iniciar`):
  - `aula-pronta.config`: nome, logo, 2 cores e rodapé; padrão neutro;
  - `aulas/NN-slug/`;
  - `lotes/`;
  - `wiki/`;
  - `.env` no `.gitignore`.
- **Número da aula:** prefixo da pasta, igual ao da plataforma. Aula com partes leva decimal em todas (7.1, 7.2).
- **Transcrição:**
  - caminho principal: SRT pronto (CapCut, YouTube, plataforma);
  - opcional: Groq Whisper, com a chave em `.env`. Checa só se a chave existe, avisa o custo antes e corta com ffmpeg acima do limite.
  - Fora: OpenAI Whisper, Whisper local e baixar aulas da plataforma.
- **PDF:**
  - pandoc gera o HTML, e o Chrome ou o Edge sem janela imprime o PDF;
  - CSS de impressão;
  - o Claude confere lendo o PDF;
  - se faltar o pandoc, instala com `winget` ou `brew` depois do "sim".
- **Descrição da aula:** genérica (título, curta, completa, "Você vai ver:", duração), sem campos de plataforma.
- **E-mail do lote:** só texto em `lotes/`. O plugin nunca envia e-mail nem mensagem.
- **Wiki do curso:**
  - uso interno do infoprodutor;
  - padrão Karpathy escrito do zero, porque `6eanut/llm-wiki` não tem licença. Citar o gist do Karpathy como inspiração.
  - `raw/` (transcrições, intocadas), página por aula e por conceito, índice, registro;
  - lint para: contradições entre aulas, lacunas, páginas sem link.
- **Escopo do curso:** num `.md` em `wiki/`, entrega:
  1. mapa de módulos;
  2. lacunas;
  3. ordem de assistir;
  4. próximas aulas a gravar, com o porquê.
- **Exemplo e teste:** v1 com 1 aula fictícia (SRT inventado); v3 com 3 aulas fictícias, com 1 contradição e 1 lacuna plantadas. Nada de cliente real.
- **Seam de teste:** um só. A pasta do curso de exemplo, com `claude plugin eval` rodando cada comando e conferindo os arquivos de saída.
- **Tracker:** issues de `kursku/aula-pronta`, privado até a v1 sair.

## Fontes de código existentes

Havia scripts anteriores do autor, em repositórios privados dele, usados só como referência de método: transcrição pelo Groq (corte com ffmpeg e retries) e conversão de SRT para Markdown. Nenhum conteúdo de cliente foi copiado.

## ADR

Nenhum. As decisões são reversíveis.
