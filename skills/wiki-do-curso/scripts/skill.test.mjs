// Guarda das regras da skill wiki-do-curso que o texto precisa manter.
// Rodar: node --test "skills/wiki-do-curso/scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LIMITE_BLOCO } from './wiki.mjs';

const ler = (arquivo) => readFileSync(new URL(arquivo, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const skill = ler('../SKILL.md');
const regras = ler('../regras-da-wiki.md');

test('allowed-tools: leitura, busca, escrita, edição e só node no Bash (nada de envio nem rede)', () => {
  assert.equal(skill.match(/^allowed-tools:[ \t]*(.*)$/m)?.[1].trim(), 'Read Write Edit Glob Grep Bash(node:*)');
});

test('o limite do bloco do script é o que a skill e as regras dizem', () => {
  assert.match(skill, new RegExp(`Até ${LIMITE_BLOCO} aulas novas é um bloco só`));
  assert.match(skill, new RegExp(`blocos de ${LIMITE_BLOCO}`));
  assert.match(regras, new RegExp(`Com mais de ${LIMITE_BLOCO} aulas novas, trabalha em blocos de ${LIMITE_BLOCO}`));
});

test('a transcrição original nunca é copiada à mão: só pelo script', () => {
  assert.match(skill, /Não copie transcrição à mão/);
  assert.match(skill, /\.\.\. copiar <aula>/);
  assert.match(regras, /Ninguém edita, nem o Claude/);
});

test('a aula só é registrada depois das páginas, e o bloco seguinte só depois do registro', () => {
  const registrar = skill.indexOf('registrar <aula>');
  assert.ok(registrar > skill.indexOf('crie `wiki/conceitos/<nome>.md`'), 'registrar vem depois das páginas');
  assert.match(skill, /Só então comece o bloco seguinte/);
});

test('dado sensível fica fora das páginas, e a cópia em raw/ é protegida pelo Git antes de existir', () => {
  assert.match(regras, /Dado sensível nunca entra numa página/);
  assert.match(skill, /gitignore: "desprotegido"`: \*\*pare, sem copiar nada/);
});

test('as regras citam o gist do Karpathy como inspiração e dizem que a implementação é própria', () => {
  assert.match(regras, /gist\.github\.com\/karpathy\/442a6bf555914893e9891c11519de94f/);
  assert.match(regras, /escrita do zero/);
});

test('o formato das páginas traz o que os tickets seguintes leem (ensina/cita, minuto, lacuna, avisos)', () => {
  for (const trecho of ['## Conceitos que ensina', '## Conceitos que só cita', '## Demonstrações', '## Afirmações',
    '## Aulas onde aparece', '## Avisos de contradição', ': ensina', ': cita', 'Nenhuma aula ensina este conceito.']) {
    assert.ok(regras.includes(trecho), `regras-da-wiki.md sem "${trecho}"`);
  }
});

test('só os termos do glossário nos textos para o infoprodutor', () => {
  for (const evitar of [/\bvídeo\b/i, /\bapostila\b/i, /\bgap\b/i, /\bwiki do aluno\b/i, /\bFAQ\b/]) {
    assert.doesNotMatch(skill, evitar);
    assert.doesNotMatch(regras, evitar);
  }
});

test('reingerir é repetível: limpar-conceitos vem antes das linhas dos conceitos e do registro', () => {
  const limpar = skill.indexOf('limpar-conceitos <aula>');
  assert.ok(limpar > 0 && limpar < skill.indexOf('crie `wiki/conceitos/<nome>.md`'), 'limpar-conceitos antes de acrescentar linhas');
  assert.ok(limpar < skill.indexOf('registrar <aula>'));
  assert.match(skill, /Conceito que `limpar-conceitos` mostrou com `restantes: 0`[^\n]*não apague a página/);
});

test('o índice sai ao fim de cada bloco, não só no fim', () => {
  const passo2 = skill.slice(skill.indexOf('## Passo 2'), skill.indexOf('## Passo 3'));
  assert.match(passo2, /`\.\.\. indice`, ainda dentro do bloco/);
});

test('aula-sem-registro manda ingerir de novo e aula-removida nunca apaga', () => {
  assert.match(skill, /`aula-sem-registro`: a ingestão dessa aula foi interrompida\. \*\*Não corrija páginas\*\*/);
  assert.match(skill, /`aula-removida`[^\n]*nunca apague nada/);
});

test('links codificados: as regras e a skill mandam, e limpar-conceitos avisa quando não acha a seção', () => {
  assert.match(regras, /Codifique cada parte do endereço/);
  assert.match(regras, /03-luz%20extra/);
  assert.match(skill, /\*\*codificados\*\*/);
  assert.match(skill, /Se devolver `avisos`/);
});

test('a página atesta a transcrição: regras, skill e tipos de problema da substituição interrompida', () => {
  assert.match(regras, /^transcricao-sha256: /m);
  assert.match(skill, /`transcricao-sha256` igual ao `sha256` que o `copiar` devolveu/);
  assert.match(skill, /`substituicao-interrompida`[^\n]*`copiar <aula> --substituir`[^\n]*`registrar <aula> --substituir`/);
  assert.match(skill, /`pagina-desatualizada`/);
});

test('pendências não travam: novas vazio ainda confere e relata; Git desconhecido para e pergunta', () => {
  assert.match(skill, /`"desconhecido"`:[^\n]*\*\*pare e pergunte ao infoprodutor\*\*/);
  assert.doesNotMatch(skill, /`"desconhecido"`: avise que não deu para conferir e siga/);
  const vazio = skill.match(/- `novas` vazio:[^\n]*/)[0];
  assert.match(vazio, /não escreva nenhuma página/);
  for (const campo of ['alteradas', 'transcricaoSumiu', 'removidas', 'orfas']) assert.ok(vazio.includes(`\`${campo}\``), campo);
  assert.doesNotMatch(vazio, /pare, sem escrever/);
  assert.match(skill, /- `transcricaoSumiu`:[^\n]*\*\*a transcrição sumiu\*\*[^\n]*Não mande rodar o `pos-gravacao`/);
  assert.match(skill, /- `pagina-orfa`:/);
  assert.match(skill, /- `registro-malformado`:/);
});

test('aulas que divergem: a definição traz o valor de cada aula, com aula e minuto, sem decidir', () => {
  assert.match(regras, /Quando as aulas divergem sobre o conceito/);
  assert.match(regras, /o valor de cada aula, com a aula e o minuto/);
  assert.match(regras, /sem escolher um deles/);
  assert.match(regras, /Decidir qual vale, ou apontar a contradição, é da verificação da wiki/);
});

test('registro malformado para a skill; aula-sem-transcricao relata e encerra como a página órfã', () => {
  assert.match(skill, /- `avisos`:[^\n]*\*\*Pare e mostre ao infoprodutor\*\*[^\n]*Corrija a linha N do registro\.md antes de registrar/);
  assert.match(skill, /- `aula-sem-transcricao`:[^\n]*\*\*Não rode a ingestão\*\*[^\n]*pos-gravacao[^\n]*relate e encerre, sem laço/);
  assert.match(skill, /- `registro-malformado`:[^\n]*relate e encerre/);
});

test('itens de "Aulas onde aparece": primeira coluna, e sub-item ou continuação andam com a aula', () => {
  assert.match(regras, /começando em `- ` \*\*na primeira coluna\*\*[^\n]*sub-item ou continuação recuados andam junto/);
});

// Operação verificar: a parte mecânica é do Claude (Glob, Grep, Read), sem script, e a verificação não corrige nada.
const verificar = skill.slice(skill.indexOf('## Operação verificar'), skill.indexOf('## Operação consultar'));

test('verificar: relata tudo, grava uma única coisa, e não roda o wiki.mjs nem o conferir', () => {
  assert.ok(verificar.length > 100, 'seção "Operação verificar" ausente');
  assert.match(verificar, /\*\*relata tudo e grava uma única coisa\*\*: a seção `## Avisos de contradição` das páginas de conceito/);
  assert.match(verificar, /Não escreva, não edite e não apague mais nada na wiki/);
  assert.match(verificar, /\*\*Não rode o `wiki\.mjs`\*\*, nem o `conferir`/);
  assert.match(verificar, /`Glob`, `Grep` e `Read`/);
  assert.doesNotMatch(verificar, /node '\$\{CLAUDE_SKILL_DIR\}/);
  assert.doesNotMatch(verificar, /^\s*(?:[-\d.]+\s*)?`?\.\.\. (copiar|registrar|indice|conferir|limpar-conceitos)/m);
});

test('verificar: cobre links quebrados, páginas soltas, citação nos dois sentidos, lacunas e contradições', () => {
  for (const trecho of ['**Link quebrado**', '**Página solta**', '**Citação nos dois sentidos**', '**Lacuna**', '**Parte de leitura: contradição.**']) {
    assert.ok(verificar.includes(trecho), `sem "${trecho}"`);
  }
  assert.match(verificar, /`indice\.md` e `registro\.md` listam tudo e \*\*não contam\*\*/);
});

test('verificar: contradição sai com as duas aulas e os dois minutos; contexto diferente não é contradição', () => {
  assert.match(verificar, /Cada contradição sai com \*\*as duas aulas e os dois minutos\*\*/);
  assert.match(verificar, /\*\*Diferença de contexto não é contradição\*\*/);
  assert.match(verificar, /A transcrição vale mais que a página/);
});

test('verificar: relatório tem as cinco seções e não inventa achado', () => {
  for (const titulo of ['**Contradições**', '**Lacunas**', '**Links quebrados**', '**Páginas soltas**', '**Citação só de um lado**']) {
    assert.ok(verificar.includes(titulo), `relatório sem ${titulo}`);
  }
  assert.match(verificar, /não inventa achado/);
  assert.match(verificar, /Só gravei a seção de avisos de contradição; o resto não foi corrigido/);
  assert.match(verificar, /\*\*Avisos gravados\*\*[^\n]*ganharam[^\n]*perderam/);
});

test('verificar: as regras da wiki dizem o mesmo (a verificação escreve só os avisos; a ingestão não mexe neles)', () => {
  assert.match(regras, /\*\*Verificar\*\*[^\n]*relata tudo e grava só a seção `## Avisos de contradição`/);
  assert.match(regras, /`## Avisos de contradição`\*\* é escrito pela verificação da wiki/);
  assert.match(regras, /não mexe na seção de uma página que já existe/);
});

test('verificar: link quebrado só em aulas/, conceitos/ e indice.md, e normaliza o alvo antes de resolver', () => {
  const link = verificar.match(/- \*\*Link quebrado\*\*:[^\n]*/)[0];
  assert.match(link, /\*\*só\*\* nas páginas de `wiki\/aulas\/` e `wiki\/conceitos\/` e em `wiki\/indice\.md`/);
  assert.match(link, /`regras\.md`/);
  assert.match(link, /pule os links com esquema \(`https:`/);
  assert.match(link, /tire `#\.\.\.` e `\?\.\.\.` do alvo/);
  assert.match(link, /tire os `<>`/);
});

test('verificar: os alvos válidos incluem as páginas da raiz de wiki/ (indice.md)', () => {
  assert.match(verificar, /`Glob` em `wiki\/\*\.md`/);
  assert.match(verificar, /alvos válidos[^\n]*indice\.md/);
});

test('verificar: página solta busca pelo alvo do link, nunca pelo nome solto', () => {
  const solta = verificar.match(/- \*\*Página solta\*\*:[^\n]*/)[0];
  assert.match(solta, /alvo do link/);
  assert.match(solta, /nunca pelo nome solto/);
  assert.match(solta, /forma codificada[^\n]*decodificada/);
  assert.doesNotMatch(solta, /pelo nome do arquivo/);
});

test('verificar: lacuna exige pelo menos uma linha cita; conceito sem linha não é lacuna', () => {
  const lacuna = verificar.match(/- \*\*Lacuna\*\*:[^\n]*/)[0];
  assert.match(lacuna, /pelo menos uma linha `: cita` e nenhuma `: ensina`/);
  assert.match(lacuna, /sem nenhuma linha não é lacuna/);
});

// Todo trecho entre crases da seção verificar que é padrão de busca precisa compilar, e achar o que a skill diz que acha.
const trechos = [...verificar.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
const NAO_E_PADRAO = new Set(['?...']); // descrição de texto ("tire `?...` do alvo"), não padrão de busca

test('verificar: todo padrão entre crases compila como regex (o rg recusa grupo aberto)', () => {
  const quebrados = [];
  for (const t of trechos.filter((x) => !NAO_E_PADRAO.has(x))) {
    try { new RegExp(t); } catch (e) { quebrados.push(`${t}: ${e.message}`); }
  }
  assert.deepEqual(quebrados, []);
});

test('verificar: os padrões de link e de alvo casam o que devem e só isso', () => {
  const link = new RegExp(trechos.find((t) => t.includes('\\]\\(')));
  assert.ok(link.test('[Muda](../conceitos/muda.md)'));
  assert.ok(link.test('[Aula](<../aulas/03-luz extra.md>)'));
  assert.ok(!link.test('[x](../axmd)'), 'o ponto do .md tem de ser literal');
  const alvos = trechos.filter((t) => t.includes('NOME'));
  assert.equal(alvos.length, 2, 'um padrão para link de outra pasta e um para a mesma pasta');
  const [outra, mesma] = alvos.map((t) => new RegExp(t.replace('NOME', 'adubo')));
  assert.ok(outra.test('[A](../conceitos/adubo.md)'));
  assert.ok(!outra.test('[A](../conceitos/excesso-de-adubo.md)'), 'excesso-de-adubo.md não é adubo.md');
  assert.ok(mesma.test('[A](adubo.md)') && mesma.test('[A](<adubo.md>)'));
  assert.ok(!mesma.test('[A](excesso-de-adubo.md)'));
});

test('verificar: o aviso é uma linha por contradição, reescrito inteiro e sem duplicar, só na seção de avisos', () => {
  const avisos = verificar.slice(verificar.indexOf('**Avisos de contradição (a única escrita).**'), verificar.indexOf('**Relatório**'));
  assert.ok(avisos.length > 200, 'passo dos avisos ausente');
  assert.match(avisos, /`Edit`/);
  assert.match(avisos, /de \*\*cada\*\* página de `wiki\/conceitos\/`, só ela/);
  assert.match(avisos, /uma linha por contradição/);
  assert.match(avisos, /\[Aula 4\]\(\.\.\/aulas\/04-adubando-a-horta\.md\) \[01:28\]/);
  assert.match(avisos, /`Nenhum aviso\.`/);
  assert.match(avisos, /\*\*Rodar de novo não duplica\*\*: a seção é reescrita inteira/);
  assert.match(avisos, /um aviso que deixou de valer sai/);
  assert.match(avisos, /lacuna, link quebrado, página solta e citação de um lado só continuam só no relatório/);
});

test('ingestão: página nova leva Nenhum aviso e página que já existe não tem a seção de avisos tocada', () => {
  const ingestao = skill.slice(0, skill.indexOf('## Operação verificar'));
  assert.match(ingestao, /\*\*Não escreva avisos de contradição\*\*: a ingestão não julga/);
  assert.match(ingestao, /em página que já existe, \*\*nunca mexa nessa seção\*\*/);
  assert.match(ingestao, /\*\*não apaga\*\* as linhas de `## Avisos de contradição`[^\n]*sai na próxima verificação/);
  assert.match(regras, /reingestão \*\*não apaga\*\* as linhas de aviso[^\n]*sai na próxima verificação/);
});

// Operação consultar: só lê, cita aula e minuto, e diz quando não está na wiki.
const consultar = skill.slice(skill.indexOf('## Operação consultar'));

test('consultar: só lê, não roda o wiki.mjs e a skill declara a operação', () => {
  assert.ok(consultar.length > 200, 'seção "Operação consultar" ausente');
  assert.match(skill, /argument-hint: ingerir \| verificar \| consultar/);
  assert.match(consultar, /A consulta \*\*só lê\*\*: não escreva, não edite e não apague nada na wiki/);
  assert.match(consultar, /\*\*não rode o `wiki\.mjs`\*\*/);
  assert.match(consultar, /`Read`, `Glob` e `Grep`/);
  assert.doesNotMatch(skill, /operação ainda não está disponível/);
  assert.match(regras, /\*\*Consultar\*\*[^\n]*só lendo[^\n]*Não escreve nada na wiki/);
});

test('consultar: índice primeiro, minuto conferido na transcrição, nunca de memória', () => {
  assert.match(consultar, /\*\*Índice primeiro\.\*\* Leia `wiki\/indice\.md`/);
  assert.match(consultar, /pelo \*\*sentido\*\*, não pelas palavras/);
  assert.match(consultar, /Confira o minuto na fonte/);
  assert.match(consultar, /A transcrição vale mais que a página/);
  assert.match(consultar, /Nunca responda de memória/);
  assert.match(consultar, /toda afirmação sai com a aula e o minuto/);
});

test('consultar: o que não está na wiki é dito sem aula, sem minuto, sem palpite e sem conhecimento geral', () => {
  assert.match(consultar, /diga \*\*claramente que isso não está na wiki do curso\*\*/);
  assert.match(consultar, /\*\*Não cite número de aula nem minuto\*\* nessa resposta/);
  assert.match(consultar, /Não diga "talvez na aula X"/);
  assert.match(consultar, /nem para dizer quais aulas a wiki cobre/);
  assert.match(consultar, /\*\*não responda com conhecimento geral\*\*/);
  assert.match(consultar, /Antes de concluir que não está na wiki, \*\*busque de novo com variações\*\*/);
  assert.match(consultar, /nas páginas e em \x60wiki\/raw\/\x60\. Se nenhum conceito, nenhuma afirmação nem nenhuma transcrição trata da pergunta, diga/);
});

test('consultar: contradição mostra as duas aulas sem escolher; lacuna diz que nenhuma aula ensina', () => {
  assert.match(consultar, /\*\*as duas aulas, os dois minutos e o que cada uma diz\*\*/);
  assert.match(consultar, /\*\*Não escolha um lado\*\*/);
  assert.match(consultar, /\*\*diga que nenhuma aula o ensina\*\*/);
  assert.match(consultar, /distingue ensinar de só citar/);
});

test('consultar: só os termos do glossário', () => {
  for (const evitar of [/\bassunto\b/i, /\btópico\b/i, /\bvídeo\b/i, /\bFAQ\b/]) assert.doesNotMatch(consultar, evitar);
});

test('consultar: o minuto se acha pelas palavras da afirmação em raw/, não pelo minuto da página', () => {
  assert.match(consultar, /procure em `wiki\/raw\/` pelas palavras da afirmação e leia o minuto de onde ela está/);
  assert.doesNotMatch(consultar, /`Grep` pelo minuto/);
  assert.match(consultar, /não escreva o minuto errado da página em lugar nenhum da resposta, nem para avisar do erro/);
});

test('consultar: a busca tenta plural, palavra sem acento, radical e sinônimos antes de dizer que não está na wiki', () => {
  const passo4 = consultar.match(/4\. \*\*Pergunta sobre algo[^\n]*/)[0];
  for (const termo of ['plural', 'sem acento', 'radical', 'sinônimos próximos']) assert.ok(passo4.includes(termo), `passo 4 sem "${termo}"`);
  assert.match(passo4, /nas páginas e em `wiki\/raw\/`/);
});

test('consultar: pergunta sobre um número de aula usa o índice e a página da aula, e repete o número que o infoprodutor digitou', () => {
  assert.match(consultar, /pergunta sobre uma aula[^\n]*linha da aula no índice e a página dela/);
  assert.match(consultar, /repetir o número que o infoprodutor digitou, sem citar nenhum outro número nem minuto/);
});

test('consultar: aviso que não bate com a transcrição: vale a transcrição e a resposta avisa que está desatualizado', () => {
  assert.match(consultar, /vale a transcrição[^\n]*aviso está desatualizado[^\n]*`verificar`/);
});

test('consultar: só entra na resposta o minuto lido em raw/, e a página errada é dita sem repetir o minuto', () => {
  assert.match(consultar, /\*\*Só escreva na resposta minutos que você leu em `wiki\/raw\/`\*\*/);
  assert.match(consultar, /escreva "a página da wiki está com o minuto desatualizado; vale o da transcrição"/);
});

test('consultar: a resposta é relida antes de enviar, para tirar minuto que só a página tinha', () => {
  assert.match(consultar, /\*\*Antes de enviar, releia a resposta:\*\* todo minuto escrito nela precisa ter sido lido em `wiki\/raw\/`/);
});

test('consultar: aula fora do índice não consta na wiki; aula no índice sem o assunto diz que o assunto não aparece nela', () => {
  assert.match(consultar, /Aula fora do índice:\*\* diga que não consta na wiki \("a aula 9 não consta na wiki"\)/);
  assert.match(consultar, /[Aa]ula que está no índice\*\* mas não trata do que ele perguntou: diga "isso não aparece nessa aula"/);
  assert.match(consultar, /nunca "a aula 4 não consta na wiki"/);
});

test('consultar: o passo 4 fecha o parêntese da busca por variação', () => {
  const passo4 = consultar.match(/4\. \*\*Pergunta sobre algo[^\n]*/)[0];
  assert.equal(passo4.split('(').length, passo4.split(')').length, 'parênteses desbalanceados no passo 4');
});

test('consultar: contradição não gravada só quando é a mesma situação (critério da verificar); contexto diferente não é contradição', () => {
  const passo5 = consultar.match(/5\. \*\*Conceito com contradição[^\n]*/)[0];
  assert.doesNotMatch(passo5, /mas o aviso não está gravado, mostre os dois do mesmo jeito/);
  assert.match(passo5, /\*\*só fale em contradição não gravada quando os dois valores são sobre a mesma situação e não podem valer juntos\*\*/);
  assert.match(passo5, /mesmo critério da `verificar`/);
  assert.match(passo5, /contextos diferentes[^.]*mostre cada um com o seu contexto, a aula e o minuto, sem falar em contradição/);
  assert.match(passo5, /planta, fase, época/);
});

test('consultar: contexto diferente sai sem a palavra contradição, nem para negá-la', () => {
  const passo5 = consultar.match(/5\. \*\*Conceito com contradição[^\n]*/)[0];
  assert.match(passo5, /sem falar em contradição nem em divergência, \*\*nem para negá-la\*\*/);
  assert.match(passo5, /não escreva "não se contradizem", "não é contradição" nem "divergem"/);
});

test('consultar: a releitura final tira a palavra contradição quando os valores são de contextos diferentes', () => {
  assert.match(consultar, /Se os valores de duas aulas são de contextos diferentes, a resposta não pode ter as palavras "contradição", "contradizem" nem "divergem"/);
});
