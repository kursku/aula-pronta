// Guarda das regras da skill escopo-do-curso que o texto precisa manter.
// Rodar: node --test "skills/escopo-do-curso/scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('frontmatter: nome da pasta, descrição e allowed-tools sem Bash, Edit nem rede', () => {
  assert.equal(skill.match(/^name:[ \t]*(.*)$/m)?.[1].trim(), 'escopo-do-curso');
  assert.match(skill.match(/^description:[ \t]*(.*)$/m)?.[1] ?? '', /wiki\/escopo\.md/);
  assert.equal(skill.match(/^allowed-tools:[ \t]*(.*)$/m)?.[1].trim(), 'Read Write Glob Grep');
});

test('só lê a wiki e grava um arquivo: wiki/escopo.md, sem script e sem Edit', () => {
  assert.match(skill, /grava um arquivo só: `wiki\/escopo\.md`/);
  assert.match(skill, /Não escreva, não edite e não apague mais nada/);
  assert.match(skill, /\*\*Não rode o `wiki\.mjs`\*\*/);
  assert.match(skill, /Grave com \*\*`Write`, o arquivo inteiro de uma vez\*\*\. Nunca `Edit`, nunca acrescente no fim/);
});

test('wiki vazia ou sem índice: manda o ingerir primeiro e não grava nada', () => {
  assert.match(skill, /Sem ele, ou sem nenhuma aula listada, diga que a wiki ainda está vazia, que o `\/aula-pronta:wiki-do-curso ingerir` vem primeiro, \*\*não grave nada\*\*/);
});

test('as quatro seções, com os títulos exatos e na ordem', () => {
  const titulos = ['## Mapa de módulos', '## Lacunas', '## Ordem de assistir', '## Próximas aulas a gravar'];
  const posicoes = titulos.map((t) => skill.lastIndexOf(`\`${t}\``));
  assert.ok(posicoes.every((p) => p > 0), `título ausente: ${posicoes}`);
  assert.deepEqual([...posicoes].sort((a, b) => a - b), posicoes);
  assert.match(skill, /As quatro seções existem sempre, mesmo vazias/);
});

test('o documento é refeito a cada execução e diz isso no topo', () => {
  assert.match(skill, /o aviso no topo/);
  assert.match(skill, /refeito a cada execução\. Não edite à mão/);
  assert.match(skill, /ignore o conteúdo ao montar o novo/);
  assert.match(skill, /acrescentar deixaria a versão anterior no documento/);
});

test('lacuna é a da verificação: cita sem nenhuma linha ensina', () => {
  assert.match(skill, /pelo menos uma linha `: cita` e nenhuma `: ensina`/);
  assert.match(skill, /Conceito sem nenhuma linha não é lacuna/);
});

test('ordem: quem usa vem depois de quem ensina, e a skill não inventa ordem em ciclo nem sem dado', () => {
  assert.match(skill, /\*\*depois\*\* da aula que o ensina/);
  assert.match(skill, /\*\*não escolha uma ordem para elas\*\*/);
  assert.match(skill, /Sem ordem possível/);
  assert.match(skill, /Sem dado para ordenar/);
  assert.match(skill, /é só desempate/);
});

test('próxima aula só sai de lacuna, com o porquê e as aulas que a citam', () => {
  assert.match(skill, /Uma por lacuna, \*\*só\*\* as que a wiki mostra/);
  assert.match(skill, /\*\*o porquê\*\*/);
});

test('só vale dado em que a aula e o conceito concordam', () => {
  assert.match(skill, /Só valem os dados em que as duas páginas concordam/);
  assert.match(skill, /## Dados que não bateram/);
});

test('só os termos do glossário nos textos para o infoprodutor', () => {
  for (const evitar of [/\bvídeo\b/i, /\bapostila\b/i, /\bgap\b/i, /\bwiki do aluno\b/i, /\bFAQ\b/, /\btrilha\b/i, /\btópico\b/i, /\bassunto\b/i]) {
    assert.doesNotMatch(skill, evitar);
  }
});

test('a ordem é uma lista numerada com o link da aula, e o ciclo nunca é numerado', () => {
  assert.match(skill, /A lista é \*\*numerada\*\*/);
  assert.match(skill, /em frases ou em itens com `-` \(nunca numerados, para não parecerem uma posição\)/);
});

test('uma aula está pronta quando alguma aula que ensina cada conceito dela já está na lista (sem ciclo falso)', () => {
  assert.match(skill, /basta que \*\*uma\*\* delas venha antes de `A`/);
  assert.match(skill, /Uma aula está pronta quando, para cada conceito que ela usa, alguma aula que o ensina já está na lista/);
  assert.doesNotMatch(skill, /vale a de menor número\./);
});

test('ciclo vale para 3 ou mais aulas e para quem depende dele, e dado que não bateu tira o conceito das lacunas', () => {
  assert.match(skill, /direta ou indiretamente/);
  assert.match(skill, /Vale para ciclo de 3 ou mais aulas/);
  assert.match(skill, /O \*\*conceito\*\* dele também não entra nas lacunas nem nas próximas aulas/);
});

test('números de aula comparados por parte e wiki vazia não apaga o escopo antigo', () => {
  assert.match(skill, /a `2\.9` vem antes da `2\.10`/);
  assert.match(skill, /não o apague: avise que ele ficou desatualizado/);
});

test('dado que não bate vale só para aquele dado: a aula continua na ordem com os outros conceitos', () => {
  assert.match(skill, /o dado não vale para a ordem; a aula continua na ordem com os outros conceitos, e o dado vai para "Dados que não bateram"/);
  assert.doesNotMatch(skill, /não entra na ordem, e o \*\*conceito\*\*/);
});

test('uma regra só para ensina e cita na mesma aula: dado que não bateu, nunca dependência nem "não há dependência"', () => {
  assert.doesNotMatch(skill, /Se `A` também ensina `C`, não há dependência/);
  assert.doesNotMatch(skill, /ou a própria aula o ensina/);
  assert.match(skill, /Uma aula só \*\*usa\*\* o conceito que lista em "só cita"/);
  assert.match(skill, /o mesmo conceito em "ensina" e em "só cita" é dado que não bateu/);
});

test('próxima aula: módulo e "antes da Aula N" saem da mesma aula, a que cita primeiro na ordem de assistir', () => {
  assert.match(skill, /a aula que o cita primeiro \*\*na ordem de assistir\*\*/);
  assert.match(skill, /Use essa mesma aula para o módulo e para o "antes da Aula N"/);
  assert.doesNotMatch(skill, /o módulo da aula que o cita primeiro e/);
});

test('ciclo é o que sobra depois da regra de pronta: segundo professor tira a aula do ciclo, seja ela do ciclo ou dependente', () => {
  assert.match(skill, /o ciclo é o que \*\*sobra\*\* depois de aplicar a regra de "pronta" até nenhuma aula estar pronta/);
  assert.match(skill, /pegue a aula pronta de menor número, dê a posição e recalcule/);
  assert.match(skill, /As que sobraram e dependem umas das outras formam o ciclo; as outras dependem dele, direta ou indiretamente/);
  assert.match(skill, /se a Aula 2 também ensina a Muda, a ordem é 2, 5, 3 e não há ciclo/);
  assert.doesNotMatch(skill, /se duas ou mais aulas se usam uma à outra/);
  assert.doesNotMatch(skill, /só fica sem posição se \*\*todas\*\*/);
});

test('quinta seção só existe com dado que não bateu, e o documento sai certo de uma vez (sem corrigir com Edit)', () => {
  assert.match(skill, /Sem dado que não bateu, \*\*não escreva\*\* a quinta seção, nem com "Nenhum\."/);
  assert.match(skill, /Monte o texto inteiro e releia-o antes do `Write`: não grave para corrigir depois com `Edit`/);
});
