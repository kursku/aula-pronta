// Testes da parte mecânica da wiki do curso (sem modelo, sem rede).
// Rodar: node --test "skills/wiki-do-curso/scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  LIMITE_BLOCO, codificarLink, compararNumeros, conferir, copiar, indice, lerCabecalho, lerRegistro, limparConceitos,
  linksQuebrados, novas, numeroDaPasta, preparar, registrar, sha256, situacaoGitignore,
} from './wiki.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(AQUI, 'wiki.mjs');
const REPO = join(AQUI, '..', '..', '..');

const curso = () => mkdtempSync(join(tmpdir(), 'ap-wiki-'));
const gravar = (raiz, caminho, conteudo) => {
  mkdirSync(join(raiz, caminho, '..'), { recursive: true });
  writeFileSync(join(raiz, caminho), conteudo);
};
const transcricao = (texto = 'fala') => `# Transcrição\n\nDuração: 01:00\n\n[00:01] ${texto}\n`;
const aula = (raiz, pasta, texto) => gravar(raiz, `aulas/${pasta}/transcricao.md`, transcricao(texto ?? pasta));
// A página atesta, no cabeçalho, a transcrição de que saiu (hash da fonte da aula; zeros se ela não existe).
const hashDaAula = (raiz, pasta) => {
  try { return sha256(readFileSync(join(raiz, 'aulas', pasta, 'transcricao.md'))); } catch { return '0'.repeat(64); }
};
const pagina = (raiz, pasta, extra = '', hash = hashDaAula(raiz, pasta)) => {
  const numero = numeroDaPasta(pasta);
  gravar(raiz, `wiki/aulas/${pasta}.md`, `---\ntipo: aula\nnumero: ${numero}\ntranscricao-sha256: ${hash}\nmodulo: Tema\nduracao: 01:00\ntitulo: Título ${numero}\nresumo: Resumo ${numero}.\n---\n\n# Aula ${numero}\n\nTranscrição original: [transcricao.md](${codificarLink(`../raw/${pasta}/transcricao.md`)})\n${extra}`);
};
const cli = (raiz, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: raiz, encoding: 'utf8' });

// Curso com as três primeiras aulas já ingeridas, na data e no bloco 1.
function cursoComTresIngeridas() {
  const raiz = curso();
  const pastas = ['01-luz', '02.1-canteiro', '03-muda'];
  for (const p of pastas) aula(raiz, p);
  preparar(raiz);
  for (const p of pastas) { copiar(raiz, p); pagina(raiz, p); }
  registrar(raiz, pastas, { data: '2026-11-01' });
  return { raiz, pastas };
}

test('número da aula: prefixo da pasta sem zeros; ordem numérica com partes decimais', () => {
  assert.equal(numeroDaPasta('01-luz'), '1');
  assert.equal(numeroDaPasta('02.1-canteiro'), '2.1');
  assert.equal(numeroDaPasta('10-colheita'), '10');
  assert.equal(numeroDaPasta('00-zero'), null);
  assert.equal(numeroDaPasta('sem-numero'), null);
  const ordenado = ['10', '2.2', '1', '3', '2.1'].sort(compararNumeros);
  assert.deepEqual(ordenado, ['1', '2.1', '2.2', '3', '10']);
});

test('preparar cria a estrutura e as regras, e nunca sobrescreve nada', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  assert.deepEqual(preparar(raiz).criados.sort(), ['wiki/aulas/', 'wiki/conceitos/', 'wiki/raw/', 'wiki/registro.md', 'wiki/regras.md']);
  assert.match(readFileSync(join(raiz, 'wiki', 'regras.md'), 'utf8'), /karpathy\/442a6bf555914893e9891c11519de94f/);
  writeFileSync(join(raiz, 'wiki', 'regras.md'), 'regra editada pelo infoprodutor\n');
  assert.deepEqual(preparar(raiz).criados, []);
  assert.equal(readFileSync(join(raiz, 'wiki', 'regras.md'), 'utf8'), 'regra editada pelo infoprodutor\n');
});

test('sem a pasta aulas/, os comandos param e mandam rodar o iniciar', () => {
  const raiz = curso();
  assert.throws(() => preparar(raiz), /iniciar/);
  assert.throws(() => novas(raiz), /iniciar/);
});

test('novas: só as aulas com transcrição e fora do registro, em ordem numérica', () => {
  const raiz = curso();
  for (const p of ['10-fim', '02.2-terra', '01-luz', '02.1-canteiro']) aula(raiz, p);
  mkdirSync(join(raiz, 'aulas', '03-sem-transcricao'));
  mkdirSync(join(raiz, 'aulas', 'bonus'));
  preparar(raiz);
  const r = novas(raiz);
  assert.deepEqual(r.novas, ['01-luz', '02.1-canteiro', '02.2-terra', '10-fim']);
  assert.deepEqual(r.semTranscricao, ['03-sem-transcricao']);
  assert.deepEqual(r.semNumero, ['bonus']);
  assert.deepEqual(r.jaRegistradas, []);
});

test('blocos: até o limite é um bloco só; acima dele, blocos do tamanho do limite', () => {
  assert.equal(LIMITE_BLOCO, 5);
  const raiz = curso();
  for (let i = 1; i <= 5; i++) aula(raiz, `0${i}-aula`);
  preparar(raiz);
  let r = novas(raiz);
  assert.equal(r.emBlocos, false);
  assert.deepEqual(r.blocos.map((b) => b.length), [5]);
  aula(raiz, '06-aula');
  aula(raiz, '07-aula');
  r = novas(raiz);
  assert.equal(r.emBlocos, true);
  assert.deepEqual(r.blocos.map((b) => b.length), [5, 2]);
  assert.deepEqual(r.blocos.flat(), r.novas);
  assert.deepEqual(novas(raiz, 3).blocos.map((b) => b.length), [3, 3, 1]);
});

test('copiar: a cópia é idêntica byte a byte (CRLF, BOM, byte fora do UTF-8, sem quebra no fim)', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas', '01-luz'), { recursive: true });
  const original = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('# Transcrição\r\n\r\nDuração: 00:05\r\n\r\n[00:01] ol'), Buffer.from([0xe9]), Buffer.from('  \r\n[00:03] fim sem quebra')]);
  writeFileSync(join(raiz, 'aulas', '01-luz', 'transcricao.md'), original);
  preparar(raiz);
  const r = copiar(raiz, '01-luz');
  const copia = readFileSync(join(raiz, 'wiki', 'raw', '01-luz', 'transcricao.md'));
  assert.ok(copia.equals(original));
  assert.equal(r.sha256, sha256(original));
  assert.equal(r.status, 'copiada');
  assert.equal(copiar(raiz, '01-luz').status, 'ja-existia');
});

test('copiar não sobrescreve uma cópia diferente sem --substituir', () => {
  const raiz = curso();
  aula(raiz, '01-luz', 'primeira');
  preparar(raiz);
  copiar(raiz, '01-luz');
  aula(raiz, '01-luz', 'regravada');
  assert.throws(() => copiar(raiz, '01-luz'), /--substituir/);
  assert.match(readFileSync(join(raiz, 'wiki', 'raw', '01-luz', 'transcricao.md'), 'utf8'), /primeira/);
  assert.equal(copiar(raiz, '01-luz', { substituir: true }).status, 'copiada');
  assert.match(readFileSync(join(raiz, 'wiki', 'raw', '01-luz', 'transcricao.md'), 'utf8'), /regravada/);
});

test('copiar recusa nome fora de aulas/, pasta sem número e aula sem transcrição', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas', '01-sem'), { recursive: true });
  mkdirSync(join(raiz, 'aulas', 'bonus'), { recursive: true });
  preparar(raiz);
  assert.throws(() => copiar(raiz, '../01-luz'), /não é uma pasta de aula/);
  assert.throws(() => copiar(raiz, '..'), /não é uma pasta de aula/);
  assert.throws(() => copiar(raiz, 'bonus'), /número/);
  assert.throws(() => copiar(raiz, '09-nao-existe'), /Não existe/);
  assert.throws(() => copiar(raiz, '01-sem'), /pos-gravacao/);
});

test('registrar exige a cópia e a página, e grava hash, data e bloco', () => {
  const raiz = curso();
  aula(raiz, '01-luz');
  preparar(raiz);
  assert.throws(() => registrar(raiz, ['01-luz']), /cópia/);
  copiar(raiz, '01-luz');
  assert.throws(() => registrar(raiz, ['01-luz']), /página/);
  pagina(raiz, '01-luz');
  assert.throws(() => registrar(raiz, ['01-luz'], { data: '1/2/2026' }), /AAAA-MM-DD/);
  const r = registrar(raiz, ['01-luz'], { data: '2026-11-05' });
  assert.deepEqual([r.bloco, r.registradas], [1, ['01-luz']]);
  const linha = lerRegistro(raiz).get('01-luz');
  assert.deepEqual(linha, { sha: sha256(readFileSync(join(raiz, 'aulas', '01-luz', 'transcricao.md'))), data: '2026-11-05', bloco: 1 });
  const de_novo = registrar(raiz, ['01-luz'], { data: '2026-12-31' });
  assert.deepEqual([de_novo.registradas, de_novo.jaRegistradas], [[], ['01-luz']]);
  assert.equal(lerRegistro(raiz).get('01-luz').data, '2026-11-05');
});

test('a quarta aula é a única processada na ingestão seguinte (o registro prova)', () => {
  const { raiz, pastas } = cursoComTresIngeridas();
  assert.deepEqual(novas(raiz).novas, []);
  const antes = readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8');
  aula(raiz, '04-adubo');
  const r = novas(raiz);
  assert.deepEqual(r.novas, ['04-adubo']);
  assert.deepEqual(r.jaRegistradas, pastas);
  assert.deepEqual(r.blocos, [['04-adubo']]);
  copiar(raiz, '04-adubo');
  pagina(raiz, '04-adubo');
  assert.deepEqual(registrar(raiz, ['04-adubo'], { data: '2026-11-13' }).registradas, ['04-adubo']);
  const depois = readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8');
  assert.ok(depois.startsWith(antes), 'as linhas das três primeiras aulas continuam como estavam');
  const registro = lerRegistro(raiz);
  assert.deepEqual([...registro.keys()], [...pastas, '04-adubo']);
  assert.deepEqual(pastas.map((p) => [registro.get(p).data, registro.get(p).bloco]), pastas.map(() => ['2026-11-01', 1]));
  assert.deepEqual([registro.get('04-adubo').data, registro.get('04-adubo').bloco], ['2026-11-13', 2]);
  assert.deepEqual(novas(raiz).novas, []);
});

test('transcrição que mudou depois de registrada aparece em alteradas e não é registrada de novo', () => {
  const { raiz } = cursoComTresIngeridas();
  aula(raiz, '03-muda', 'regravada');
  const r = novas(raiz);
  assert.deepEqual([r.novas, r.alteradas], [[], ['03-muda']]);
  assert.throws(() => registrar(raiz, ['03-muda']), /mudou depois da cópia/);
});

test('índice: uma linha por página, a partir do cabeçalho, em ordem de aula e de nome', () => {
  const raiz = curso();
  aula(raiz, '02.1-canteiro');
  aula(raiz, '01-luz');
  writeFileSync(join(raiz, 'aula-pronta.config'), 'nome-do-curso: Horta em Casa\n');
  preparar(raiz);
  pagina(raiz, '02.1-canteiro');
  pagina(raiz, '01-luz');
  gravar(raiz, 'wiki/conceitos/rega.md', '---\ntipo: conceito\nnome: Rega\ndefinicao: Dar água à planta.\n---\n\n# Rega\n');
  gravar(raiz, 'wiki/conceitos/adubo.md', '---\ntipo: conceito\nnome: Adubo\ndefinicao: Nenhuma aula ensina este conceito.\n---\n\n# Adubo\n');
  assert.deepEqual(indice(raiz), { aulas: 2, conceitos: 2, ignoradas: [], reordenados: [] });
  const texto = readFileSync(join(raiz, 'wiki', 'indice.md'), 'utf8');
  assert.match(texto, /^# Índice da wiki: Horta em Casa/);
  assert.ok(texto.indexOf('aulas/01-luz.md') < texto.indexOf('aulas/02.1-canteiro.md'));
  assert.ok(texto.indexOf('conceitos/adubo.md') < texto.indexOf('conceitos/rega.md'));
  assert.match(texto, /- \[Aula 2\.1: Título 2\.1\]\(aulas\/02\.1-canteiro\.md\) · Módulo: Tema · 01:00 · Resumo 2\.1\./);
  assert.match(texto, /- \[Adubo\]\(conceitos\/adubo\.md\) · Nenhuma aula ensina este conceito\./);
});

test('índice recusa página sem campo e número que não é o da pasta', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  gravar(raiz, 'wiki/aulas/01-luz.md', '---\ntipo: aula\nnumero: 7\ntitulo: Luz\n---\n');
  gravar(raiz, 'wiki/conceitos/rega.md', '# Rega sem cabeçalho\n');
  assert.throws(() => indice(raiz), (e) => /modulo/.test(e.message) && /duracao/.test(e.message) && /resumo/.test(e.message)
    && /numero "7"/.test(e.message) && /conceitos\/rega\.md: falta o campo "nome"/.test(e.message));
});

test('cabeçalho: valor com dois-pontos e CRLF', () => {
  assert.deepEqual(lerCabecalho('---\r\nresumo: Passo 1: faça isto\r\nnumero: 2.1\r\n---\r\ncorpo'), { resumo: 'Passo 1: faça isto', numero: '2.1' });
  assert.deepEqual(lerCabecalho('sem cabeçalho'), {});
});

test('conferir: wiki consistente dá ok; link quebrado, cópia alterada e aula sem registro são achados', () => {
  const { raiz } = cursoComTresIngeridas();
  assert.equal(conferir(raiz).ok, true);
  gravar(raiz, 'wiki/conceitos/luz.md', '---\ntipo: conceito\nnome: Luz\ndefinicao: x\n---\n\n[ok](../aulas/01-luz.md#topo) [site](https://exemplo.com/a.md) [âncora](#x) [quebrado](../aulas/99-nao-existe.md)\n');
  aula(raiz, '04-sem-registro');
  pagina(raiz, '04-sem-registro');
  writeFileSync(join(raiz, 'wiki', 'raw', '01-luz', 'transcricao.md'), 'adulterada');
  const tipos = conferir(raiz).problemas.map((p) => `${p.tipo}:${p.arquivo}`).sort();
  assert.deepEqual(tipos, [
    'aula-sem-registro:aulas/04-sem-registro.md',
    'copia-alterada:wiki/raw/01-luz/transcricao.md',
    'link-quebrado:wiki/aulas/04-sem-registro.md', // aponta para a cópia que ninguém fez
    'link-quebrado:wiki/conceitos/luz.md',
  ]);
});

test('Git: transcricao.md ignorada = protegido; sem a regra = desprotegido; fora de repositório = sem-git', (t) => {
  if (spawnSync('git', ['--version']).status !== 0) return t.skip('git não instalado');
  const raiz = curso();
  assert.equal(situacaoGitignore(raiz), 'sem-git');
  spawnSync('git', ['init', '-q'], { cwd: raiz });
  assert.equal(situacaoGitignore(raiz), 'desprotegido');
  writeFileSync(join(raiz, '.gitignore'), '.env\ntranscricao.md\n');
  assert.equal(situacaoGitignore(raiz), 'protegido');
});

test('linha de comando: preparar, novas, copiar, registrar, indice e conferir; erro sai com 1', () => {
  const raiz = curso();
  aula(raiz, '01-luz');
  assert.equal(cli(raiz, 'preparar').status, 0);
  assert.deepEqual(JSON.parse(cli(raiz, 'novas').stdout).novas, ['01-luz']);
  assert.equal(cli(raiz, 'copiar', 'aulas/01-luz/').status, 0);
  assert.match(cli(raiz, 'registrar', '01-luz').stderr, /página/);
  pagina(raiz, '01-luz');
  assert.equal(cli(raiz, 'registrar', '01-luz', '--data', '2026-11-13').status, 0);
  assert.equal(cli(raiz, 'indice').status, 0);
  assert.equal(JSON.parse(cli(raiz, 'conferir').stdout).ok, true);
  gravar(raiz, 'wiki/conceitos/x.md', '[a](nao-existe.md)');
  const falha = cli(raiz, 'conferir');
  assert.equal(falha.status, 1);
  assert.equal(JSON.parse(falha.stdout).problemas[0].tipo, 'link-quebrado');
  const erro = cli(raiz, 'inventado');
  assert.equal(erro.status, 1);
  assert.match(erro.stderr, /Comando desconhecido/);
  assert.equal(cli(raiz, 'novas', '--limite', 'x').status, 1);
});

// O curso de exemplo: as seis aulas viram seis aulas novas, em dois blocos (5 + 1), e as duas coisas plantadas
// (a contradição e a lacuna) estão nos minutos que a referência dos comandos anuncia.
test('curso de exemplo: seis aulas em dois blocos; contradição e lacuna plantadas nos minutos certos', () => {
  const raiz = curso();
  cpSync(join(REPO, 'exemplo', 'horta-em-casa'), raiz, { recursive: true });
  const conversor = join(REPO, 'skills', 'pos-gravacao', 'scripts', 'srt-para-transcricao.mjs');
  const aulas = readdirSync(join(raiz, 'aulas'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  for (const a of aulas) {
    const r = spawnSync(process.execPath, [conversor, join(raiz, 'aulas', a, 'gravacao.srt'), join(raiz, 'aulas', a, 'transcricao.md')], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  }
  preparar(raiz);
  const r = novas(raiz);
  assert.deepEqual(r.novas, ['01-luz-e-agua', '02.1-montando-o-canteiro', '02.2-escolhendo-a-terra', '03-plantando-as-mudas', '04-adubando-a-horta', '05-folhas-amarelas-e-pragas']);
  assert.deepEqual(r.blocos.map((b) => b.length), [5, 1]);
  assert.equal(r.gitignore === 'protegido' || r.gitignore === 'sem-git' || r.gitignore === 'desconhecido', true, `gitignore: ${r.gitignore}`);
  const linha = (a, marca) => readFileSync(join(raiz, 'aulas', a, 'transcricao.md'), 'utf8').split('\n').find((l) => l.startsWith(`[${marca}]`));
  assert.match(linha('04-adubando-a-horta', '01:28'), /a cada quinze dias/);
  assert.match(linha('05-folhas-amarelas-e-pragas', '00:36'), /uma vez por mês, não mais que isso/);
  assert.match(linha('04-adubando-a-horta', '01:04'), /não vai ver aqui/);
  assert.match(linha('05-folhas-amarelas-e-pragas', '02:24'), /composto curtido/);
  assert.match(linha('02.2-escolhendo-a-terra', '00:05'), /uma de composto/);
  assert.match(linha('05-folhas-amarelas-e-pragas', '02:35'), /\(11\) 99999-0001/);
  const todas = aulas.map((a) => readFileSync(join(raiz, 'aulas', a, 'transcricao.md'), 'utf8')).join('\n');
  assert.doesNotMatch(todas, /ensin\w+ (o )?composto|compostagem/i, 'nenhuma aula ensina o composto');
  const terra = readFileSync(join(raiz, 'aulas', '02.2-escolhendo-a-terra', 'transcricao.md'), 'utf8');
  assert.equal(terra.match(/composto/g).length, 1, 'a 2.2 só USA o composto na mistura: não diz o que ele é nem para que serve');
  assert.doesNotMatch(terra, /composto (d[áa]|é|serve|tem|ajuda|traz)|nutriente/i);
});

// ---- Rodada 2 (review do agy)

test('nome de aula com espaço, % ou parêntese: o registro lê a linha, o índice codifica o link e ele leva à página', () => {
  for (const pasta of ['03-luz extra', '03-100%-natural', '03-mudas (1)#2']) {
    const raiz = curso();
    aula(raiz, pasta);
    preparar(raiz);
    copiar(raiz, pasta);
    pagina(raiz, pasta);
    registrar(raiz, [pasta], { data: '2026-11-01' });
    assert.deepEqual([...lerRegistro(raiz).keys()], [pasta]);
    const r = novas(raiz);
    assert.deepEqual([r.novas, r.alteradas, r.jaRegistradas], [[], [], [pasta]]);
    indice(raiz);
    const texto = readFileSync(join(raiz, 'wiki', 'indice.md'), 'utf8');
    const alvo = codificarLink(`aulas/${pasta}.md`);
    assert.ok(texto.includes(`](${alvo})`), `o índice precisa ter o link ${alvo}`);
    assert.doesNotMatch(alvo, /[ #?()]|%(?![0-9A-F]{2})/, 'o alvo do link não tem caractere solto');
    assert.deepEqual(linksQuebrados(raiz, 'indice.md'), [], 'o link do índice leva a um arquivo');
    assert.equal(conferir(raiz).ok, true);
    indice(raiz); // regenerar o índice não desfaz nada: sem laço de conferir
    assert.equal(conferir(raiz).ok, true);
  }
});

test('link com espaço sem codificar é quebrado; com %20 ou entre <> leva à página', () => {
  const raiz = curso();
  aula(raiz, '03-luz extra');
  preparar(raiz);
  copiar(raiz, '03-luz extra');
  gravar(raiz, 'wiki/conceitos/x.md', '---\ntipo: conceito\nnome: X\ndefinicao: x\n---\n[a](../raw/03-luz extra/transcricao.md) [b](../raw/03-luz%20extra/transcricao.md) [c](<../raw/03-luz extra/transcricao.md>) [d](../raw/03-luz%20extra/transcricao.md "título")\n');
  const q = linksQuebrados(raiz, 'conceitos/x.md');
  assert.equal(q.length, 1);
  assert.match(q[0].alvo, /03-luz extra/);
  assert.match(q[0].motivo, /%20/);
});

test('nome de aula com | é recusado (quebraria a tabela do registro)', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  assert.throws(() => copiar(raiz, '03-a|b'), /não é uma pasta de aula/);
});

const conceito = (raiz, slug, linhas) =>
  gravar(raiz, `wiki/conceitos/${slug}.md`, `---\ntipo: conceito\nnome: ${slug}\ndefinicao: x\n---\n\n# ${slug}\n\n## Definição\nTexto que cita [a aula](../aulas/04-adubo.md) fora da lista.\n\n## Aulas onde aparece\n${linhas.join('\n')}\n\n## Avisos de contradição\nNenhum aviso.\n`);

test('limparConceitos tira só as linhas da aula, em "Aulas onde aparece", e é idempotente', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const l = (n, pasta, tipo) => `- [Aula ${n}](../aulas/${pasta}.md) [00:10]: ${tipo}`;
  conceito(raiz, 'adubo', [l(3, '03-muda', 'cita'), l(4, '04-adubo', 'ensina')]);
  conceito(raiz, 'so-quatro', [l(4, '04-adubo', 'ensina')]);
  conceito(raiz, 'outro', [l(3, '03-muda', 'ensina')]);
  const r = limparConceitos(raiz, '04-adubo');
  assert.deepEqual(r.conceitos.map((c) => [c.arquivo, c.removidas, c.restantes]).sort(), [['conceitos/adubo.md', 1, 1], ['conceitos/so-quatro.md', 1, 0]]);
  const adubo = readFileSync(join(raiz, 'wiki', 'conceitos', 'adubo.md'), 'utf8');
  assert.match(adubo, /\[Aula 3\]\(\.\.\/aulas\/03-muda\.md\)/);
  assert.doesNotMatch(adubo, /\[Aula 4\]/);
  assert.match(adubo, /Texto que cita \[a aula\]\(\.\.\/aulas\/04-adubo\.md\) fora da lista\./);
  assert.match(adubo, /## Avisos de contradição\nNenhum aviso\./);
  assert.deepEqual(limparConceitos(raiz, '04-adubo').conceitos, []);
});

test('novas lista a aula interrompida (página sem registro); conferir manda ingerir de novo, não corrigir páginas', () => {
  const { raiz } = cursoComTresIngeridas();
  aula(raiz, '04-adubo');
  copiar(raiz, '04-adubo');
  pagina(raiz, '04-adubo');
  assert.deepEqual(novas(raiz).interrompidas, ['04-adubo']);
  const p = conferir(raiz).problemas.find((x) => x.tipo === 'aula-sem-registro');
  assert.match(p.detalhe, /ingest/i);
  assert.doesNotMatch(p.detalhe, /corrij/i);
  assert.deepEqual(novas(raiz, 5).novas, ['04-adubo']);
});

test('link com % solto vira link quebrado com mensagem, sem derrubar o conferir', () => {
  const { raiz } = cursoComTresIngeridas();
  gravar(raiz, 'wiki/conceitos/x.md', '---\ntipo: conceito\nnome: X\ndefinicao: x\n---\n[a](100%.md) [b](adubo-100%organico.md)\n');
  const q = conferir(raiz).problemas.filter((p) => p.tipo === 'link-quebrado');
  assert.equal(q.length, 2);
  assert.match(q[0].detalhe, /100%\.md/);
  assert.match(q[0].detalhe, /%/);
});

test('BOM no começo do arquivo: o cabeçalho é lido e o índice sai', () => {
  assert.deepEqual(lerCabecalho('﻿---\nnumero: 4\n---\ncorpo'), { numero: '4' });
  const raiz = curso();
  aula(raiz, '01-luz');
  preparar(raiz);
  pagina(raiz, '01-luz');
  const arquivo = join(raiz, 'wiki', 'aulas', '01-luz.md');
  writeFileSync(arquivo, '﻿' + readFileSync(arquivo, 'utf8'));
  assert.equal(indice(raiz).aulas, 1);
});

test('aula do registro que sumiu de aulas/ (renomeada ou apagada): conferir e novas apontam, sem apagar nada', () => {
  const { raiz } = cursoComTresIngeridas();
  rmSync(join(raiz, 'aulas', '03-muda'), { recursive: true });
  assert.deepEqual(novas(raiz).removidas, ['03-muda']);
  const p = conferir(raiz).problemas.find((x) => x.tipo === 'aula-removida');
  assert.equal(p.arquivo, 'wiki/aulas/03-muda.md');
  assert.match(p.detalhe, /infoprodutor/);
  assert.match(p.detalhe, /não apaga/i);
  assert.ok(readFileSync(join(raiz, 'wiki', 'aulas', '03-muda.md')));
  assert.ok(readFileSync(join(raiz, 'wiki', 'raw', '03-muda', 'transcricao.md')));
});

test('link com a caixa errada é quebrado mesmo onde o sistema de arquivos não diferencia', () => {
  const { raiz } = cursoComTresIngeridas();
  gravar(raiz, 'wiki/conceitos/rega.md', '---\ntipo: conceito\nnome: Rega\ndefinicao: x\n---\n');
  const pg = join(raiz, 'wiki', 'aulas', '03-muda.md');
  writeFileSync(pg, readFileSync(pg, 'utf8') + '\n[r](../conceitos/Rega.md) [ok](../conceitos/rega.md)\n');
  const q = conferir(raiz).problemas.filter((p) => p.tipo === 'link-quebrado');
  assert.equal(q.length, 1);
  assert.match(q[0].detalhe, /Rega\.md/);
});

test('linha de comando aceita .\aulas\NN-nome\ e ./aulas/NN-nome/', () => {
  const raiz = curso();
  aula(raiz, '01-luz');
  aula(raiz, '02-agua');
  cli(raiz, 'preparar');
  assert.equal(cli(raiz, 'copiar', '.\\aulas\\01-luz\\').status, 0);
  assert.equal(cli(raiz, 'copiar', './aulas/02-agua/').status, 0);
});

test('.md que não é aula em wiki/aulas/ é ignorado com aviso no índice e não vira problema no conferir', () => {
  const { raiz } = cursoComTresIngeridas();
  gravar(raiz, 'wiki/aulas/LEIAME.md', '# Notas soltas\n');
  const r = indice(raiz);
  assert.equal(r.aulas, 3);
  assert.deepEqual(r.ignoradas, ['aulas/LEIAME.md']);
  assert.equal(conferir(raiz).ok, true);
  assert.doesNotMatch(readFileSync(join(raiz, 'wiki', 'indice.md'), 'utf8'), /LEIAME/);
});

// ---- Rodada 3 (review do Sonnet, adjudicado)

const cabecalhoConceito = (nome) => `---\ntipo: conceito\nnome: ${nome}\ndefinicao: x\n---\n\n# ${nome}\n\n`;

test('limparConceitos acha a aula pelo link codificado (%20, %25), entre <> e com âncora', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  gravar(raiz, 'wiki/conceitos/a.md', `${cabecalhoConceito('A')}## Aulas onde aparece\n- [Aula 3](../aulas/03-luz%20extra.md) [00:10]: cita\n- [Aula 4](../aulas/04-x.md) [00:10]: ensina\n`);
  gravar(raiz, 'wiki/conceitos/b.md', `${cabecalhoConceito('B')}## Aulas onde aparece\n- [Aula 3](<../aulas/03-luz extra.md>) [00:10]: cita\n- [Aula 3](../aulas/03-luz%20extra.md#topo) [00:20]: cita\n`);
  gravar(raiz, 'wiki/conceitos/c.md', `${cabecalhoConceito('C')}## Aulas onde aparece\n- [Aula 3](../aulas/03-100%25-natural.md) [00:10]: ensina\n`);
  const r = limparConceitos(raiz, '03-luz extra');
  assert.deepEqual(r.conceitos.map((c) => [c.arquivo, c.removidas, c.restantes]), [['conceitos/a.md', 1, 1], ['conceitos/b.md', 2, 0]]);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(limparConceitos(raiz, '03-100%-natural').conceitos.map((c) => c.arquivo), ['conceitos/c.md']);
});

test('limparConceitos aceita marcadores -, * e + e o título "## Aulas onde aparece:"', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const linhas = ['* [Aula 4](../aulas/04-x.md) [00:10]: ensina', '+ [Aula 4](../aulas/04-x.md) [00:20]: cita', '- [Aula 5](../aulas/05-y.md) [00:10]: cita'];
  gravar(raiz, 'wiki/conceitos/a.md', `${cabecalhoConceito('A')}## Aulas onde aparece:\n${linhas.join('\n')}\n\n## Avisos de contradição\nNenhum aviso.\n`);
  const r = limparConceitos(raiz, '04-x');
  assert.deepEqual(r.conceitos.map((c) => [c.removidas, c.restantes]), [[2, 1]]);
  const texto = readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8');
  assert.doesNotMatch(texto, /04-x/);
  assert.match(texto, /05-y/);
  assert.match(texto, /## Avisos de contradição\nNenhum aviso\./);
});

test('limparConceitos avisa quando o conceito cita a aula e a seção não é reconhecida; não mexe no arquivo', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const semSecao = `${cabecalhoConceito('A')}## Onde aparece\n- [Aula 4](../aulas/04-x.md) [00:10]: ensina\n`;
  const outraLista = `${cabecalhoConceito('B')}## Aulas onde aparece\n- [Aula 5](../aulas/05-y.md) [00:10]: cita\n\n## Notas\n- [Aula 4](../aulas/04-x.md) [00:30]: cita\n`;
  const soProsa = `${cabecalhoConceito('C')}## Definição\nCitada na [aula 4](../aulas/04-x.md).\n\n## Aulas onde aparece\n- [Aula 5](../aulas/05-y.md) [00:10]: cita\n`;
  gravar(raiz, 'wiki/conceitos/a.md', semSecao);
  gravar(raiz, 'wiki/conceitos/b.md', outraLista);
  gravar(raiz, 'wiki/conceitos/c.md', soProsa);
  const r = limparConceitos(raiz, '04-x');
  assert.deepEqual(r.conceitos, []);
  assert.deepEqual(r.avisos.map((a) => a.arquivo), ['conceitos/a.md', 'conceitos/b.md']);
  assert.match(r.avisos[0].aviso, /Aulas onde aparece/);
  assert.equal(readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8'), semSecao);
  assert.equal(readFileSync(join(raiz, 'wiki', 'conceitos', 'b.md'), 'utf8'), outraLista);
});

test('limparConceitos ignora a seção de avisos de contradição: linha de aviso que cita a aula não gera aviso e não é apagada', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const aviso = '- [Aula 4](../aulas/04-x.md) [01:28] diz a cada quinze dias; [Aula 5](../aulas/05-y.md) [00:36] diz uma vez por mês.';
  const com = (nome, lista) => `${cabecalhoConceito(nome)}## Aulas onde aparece\n${lista}\n\n## Avisos de contradição\n${aviso}\n`;
  // (a) a aula reingerida só aparece no aviso; (b) aparece na lista e no aviso.
  const soNoAviso = com('A', '- [Aula 5](../aulas/05-y.md) [00:36]: ensina');
  const naListaENoAviso = com('B', '- [Aula 4](../aulas/04-x.md) [01:28]: ensina\n- [Aula 5](../aulas/05-y.md) [00:36]: ensina');
  gravar(raiz, 'wiki/conceitos/a.md', soNoAviso);
  gravar(raiz, 'wiki/conceitos/b.md', naListaENoAviso);
  const r = limparConceitos(raiz, '04-x');
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(r.conceitos.map((c) => [c.arquivo, c.removidas, c.restantes]), [['conceitos/b.md', 1, 1]]);
  assert.equal(readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8'), soNoAviso);
  assert.equal(readFileSync(join(raiz, 'wiki', 'conceitos', 'b.md'), 'utf8'), com('B', '- [Aula 5](../aulas/05-y.md) [00:36]: ensina'));
});

test('limparConceitos: conceito sem "## Aulas onde aparece" que só cita a aula num aviso não gera aviso', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const texto = `${cabecalhoConceito('C')}## Avisos de contradição\n- [Aula 4](../aulas/04-x.md) [01:28] diz a cada quinze dias; [Aula 5](../aulas/05-y.md) [00:36] diz uma vez por mês.\n`;
  gravar(raiz, 'wiki/conceitos/c.md', texto);
  assert.deepEqual(limparConceitos(raiz, '04-x').avisos, []);
  assert.equal(readFileSync(join(raiz, 'wiki', 'conceitos', 'c.md'), 'utf8'), texto);
});

test('limparConceitos continua avisando de lista fora da seção quando há seção de avisos depois', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const texto = `${cabecalhoConceito('B')}## Aulas onde aparece\n- [Aula 5](../aulas/05-y.md) [00:10]: cita\n\n## Notas\n- [Aula 4](../aulas/04-x.md) [00:30]: cita\n\n## Avisos de contradição\nNenhum aviso.\n`;
  gravar(raiz, 'wiki/conceitos/b.md', texto);
  assert.deepEqual(limparConceitos(raiz, '04-x').avisos.map((a) => a.arquivo), ['conceitos/b.md']);
});

test('indice põe "Aulas onde aparece" em ordem numérica (10 depois de 2.1) e avisa quais conceitos mudou', () => {
  const raiz = curso();
  aula(raiz, '02.1-a');
  preparar(raiz);
  pagina(raiz, '02.1-a');
  const l = (n, pasta) => `- [Aula ${n}](../aulas/${pasta}.md) [00:10]: cita`;
  gravar(raiz, 'wiki/conceitos/a.md', `${cabecalhoConceito('A')}## Aulas onde aparece\n${[l(10, '10-j'), l('2.1', '02.1-a'), l(3, '03-c'), l(2, '02-b')].join('\n')}\n\n## Avisos de contradição\nNenhum aviso.\n`);
  gravar(raiz, 'wiki/conceitos/b.md', `${cabecalhoConceito('B')}## Aulas onde aparece\n${[l(2, '02-b'), l(3, '03-c')].join('\n')}\n`);
  assert.deepEqual(indice(raiz).reordenados, ['conceitos/a.md']);
  const texto = readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8');
  const ordem = ['02-b', '02.1-a', '03-c', '10-j'].map((p) => texto.indexOf(`aulas/${p}.md`));
  assert.deepEqual([...ordem].sort((x, y) => x - y), ordem);
  assert.match(texto, /## Avisos de contradição\nNenhum aviso\./);
  assert.deepEqual(indice(raiz).reordenados, []);
});

test('registrar --substituir sem reescrever a página é recusado; com a página nova passa', () => {
  const { raiz } = cursoComTresIngeridas();
  const antes = readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8');
  aula(raiz, '03-muda', 'regravada');
  copiar(raiz, '03-muda', { substituir: true });
  assert.throws(() => registrar(raiz, ['03-muda'], { substituir: true }), /página.*transcricao-sha256/s);
  assert.equal(readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8'), antes, 'o registro não mudou');
  pagina(raiz, '03-muda', '', '0'.repeat(64));
  assert.throws(() => registrar(raiz, ['03-muda'], { substituir: true }), /transcricao-sha256/);
  pagina(raiz, '03-muda');
  assert.deepEqual(registrar(raiz, ['03-muda'], { substituir: true, data: '2026-11-13' }).registradas, ['03-muda']);
  assert.equal(lerRegistro(raiz).get('03-muda').sha, hashDaAula(raiz, '03-muda'));
  assert.equal(conferir(raiz).ok, true);
});

test('registrar recusa página sem o campo transcricao-sha256', () => {
  const raiz = curso();
  aula(raiz, '01-luz');
  preparar(raiz);
  copiar(raiz, '01-luz');
  pagina(raiz, '01-luz');
  const arquivo = join(raiz, 'wiki', 'aulas', '01-luz.md');
  writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace(/^transcricao-sha256:.*\n/m, ''));
  assert.throws(() => registrar(raiz, ['01-luz']), /transcricao-sha256/);
});

test('conferir acha a página que não atesta a transcrição registrada (hash trocado ou campo apagado)', () => {
  const { raiz } = cursoComTresIngeridas();
  assert.equal(conferir(raiz).ok, true);
  pagina(raiz, '03-muda', '', 'a'.repeat(64));
  const arquivo = join(raiz, 'wiki', 'aulas', '01-luz.md');
  writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replace(/^transcricao-sha256:.*\n/m, ''));
  const p = conferir(raiz).problemas.filter((x) => x.tipo === 'pagina-desatualizada');
  assert.deepEqual(p.map((x) => x.arquivo).sort(), ['wiki/aulas/01-luz.md', 'wiki/aulas/03-muda.md']);
  assert.match(p[0].detalhe, /transcricao-sha256/);
});

test('substituição interrompida: a cópia já é a nova e o registro ainda tem o hash antigo', () => {
  const { raiz } = cursoComTresIngeridas();
  aula(raiz, '03-muda', 'regravada');
  copiar(raiz, '03-muda', { substituir: true }); // a rodada caiu aqui, antes do registrar
  const problemas = conferir(raiz).problemas;
  assert.deepEqual(problemas.map((x) => x.tipo), ['substituicao-interrompida']);
  assert.equal(problemas[0].arquivo, 'wiki/raw/03-muda/transcricao.md');
  for (const palavra of [/copiar/, /registrar/, /--substituir/]) assert.match(problemas[0].detalhe, palavra);
  assert.doesNotMatch(problemas[0].detalhe, /pare/i);
  assert.deepEqual(novas(raiz).alteradas, ['03-muda']);
  // O caminho que a mensagem manda dá certo: copiar de novo, página nova, registrar --substituir.
  assert.equal(copiar(raiz, '03-muda', { substituir: true }).status, 'ja-existia');
  pagina(raiz, '03-muda');
  registrar(raiz, ['03-muda'], { substituir: true });
  assert.equal(conferir(raiz).ok, true);
});

test('cópia em raw alterada à mão (diferente da fonte e do registro) continua sendo copia-alterada', () => {
  const { raiz } = cursoComTresIngeridas();
  writeFileSync(join(raiz, 'wiki', 'raw', '03-muda', 'transcricao.md'), 'adulterada');
  assert.deepEqual(conferir(raiz).problemas.map((x) => x.tipo), ['copia-alterada']);
});

test('página órfã (sem registro e sem pasta em aulas/): novas lista, conferir tem mensagem própria e não manda ingerir', () => {
  const { raiz } = cursoComTresIngeridas();
  pagina(raiz, '07-renomeada'); // a pasta 07-renomeada não existe
  aula(raiz, '04-adubo');
  pagina(raiz, '04-adubo'); // interrompida: tem pasta
  const r = novas(raiz);
  assert.deepEqual(r.orfas, ['07-renomeada']);
  assert.deepEqual(r.interrompidas, ['04-adubo']);
  const orfa = conferir(raiz).problemas.find((x) => x.tipo === 'pagina-orfa');
  assert.equal(orfa.arquivo, 'aulas/07-renomeada.md');
  assert.match(orfa.detalhe, /infoprodutor/);
  assert.match(orfa.detalhe, /não apaga/i);
  assert.match(orfa.detalhe, /ingestão de novo não resolve/);
  assert.doesNotMatch(orfa.detalhe, /interrompida|do começo/);
  const tipos = conferir(raiz).problemas.filter((x) => x.arquivo === 'aulas/04-adubo.md').map((x) => x.tipo);
  assert.ok(tipos.includes('aula-sem-registro'), 'a interrompida segue como aula-sem-registro');
  assert.ok(readFileSync(join(raiz, 'wiki', 'aulas', '07-renomeada.md')), 'nada é apagado');
});

test('Git: erro que não é "not a git repository" (dubious ownership) é desconhecido, não sem-git', () => {
  const falso = (respostas) => (args) => respostas[args[0]];
  const dubious = { status: 128, stdout: '', stderr: "fatal: detected dubious ownership in repository at '/mnt/c/curso'\n" };
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': dubious })), 'desconhecido');
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': { status: 128, stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n' } })), 'sem-git');
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': { status: null, error: new Error('ENOENT') } })), 'desconhecido');
  const dentro = { status: 0, stdout: 'true\n', stderr: '' };
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': dentro, 'check-ignore': { status: 0 } })), 'protegido');
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': dentro, 'check-ignore': { status: 1 } })), 'desprotegido');
  assert.equal(situacaoGitignore('x', falso({ 'rev-parse': dentro, 'check-ignore': { status: 128, stderr: 'fatal: algo' } })), 'desconhecido');
});

test('copiar recusa quando o Git não ignora transcricao.md, sem depender do modelo; protegido e sem-git copiam', (t) => {
  if (spawnSync('git', ['--version']).status !== 0) return t.skip('git não instalado');
  const raiz = curso();
  aula(raiz, '01-luz');
  preparar(raiz);
  assert.equal(copiar(raiz, '01-luz').status, 'copiada'); // fora de repositório: sem-git
  rmSync(join(raiz, 'wiki', 'raw', '01-luz'), { recursive: true });
  spawnSync('git', ['init', '-q'], { cwd: raiz });
  assert.throws(() => copiar(raiz, '01-luz'), /não ignora.*iniciar/s);
  assert.throws(() => copiar(raiz, '01-luz', { substituir: true }), /não ignora/);
  assert.equal(novas(raiz).gitignore, 'desprotegido');
  assert.throws(() => readFileSync(join(raiz, 'wiki', 'raw', '01-luz', 'transcricao.md')), /ENOENT/);
  writeFileSync(join(raiz, '.gitignore'), 'transcricao.md\n');
  assert.equal(copiar(raiz, '01-luz').status, 'copiada');
});

test('copiar confere o destino real de cada aula: exceção "!" no .gitignore recusa só aquela aula, sem copiar nada dela', (t) => {
  if (spawnSync('git', ['--version']).status !== 0) return t.skip('git não instalado');
  const raiz = curso();
  aula(raiz, '01-luz');
  aula(raiz, '02-agua');
  preparar(raiz);
  spawnSync('git', ['init', '-q'], { cwd: raiz });
  writeFileSync(join(raiz, '.gitignore'), 'transcricao.md\n!wiki/raw/01-luz/transcricao.md\n');
  assert.throws(() => copiar(raiz, '01-luz'), (e) => /não ignora/.test(e.message) && /wiki\/raw\/01-luz\/transcricao\.md/.test(e.message));
  assert.throws(() => copiar(raiz, '01-luz', { substituir: true }), /não ignora/);
  assert.equal(existsSync(join(raiz, 'wiki', 'raw', '01-luz')), false, 'nem a pasta de destino é criada');
  assert.equal(copiar(raiz, '02-agua').status, 'copiada'); // o destino desta aula está ignorado
  const soltos = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: raiz, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(soltos, /transcricao/, 'nenhuma transcrição fica visível ao Git');
});

test('aula registrada cuja transcricao.md sumiu: novas diz que sumiu e copiar não manda rodar o pos-gravacao', () => {
  const { raiz } = cursoComTresIngeridas();
  rmSync(join(raiz, 'aulas', '03-muda', 'transcricao.md'));
  mkdirSync(join(raiz, 'aulas', '04-sem-transcricao'));
  const r = novas(raiz);
  assert.deepEqual([r.transcricaoSumiu, r.semTranscricao], [['03-muda'], ['04-sem-transcricao']]);
  assert.throws(() => copiar(raiz, '03-muda'), (e) => /sumiu/.test(e.message) && !/pos-gravacao/.test(e.message));
  assert.throws(() => copiar(raiz, '04-sem-transcricao'), /pos-gravacao/);
});

test('linha malformada no registro gera aviso em novas e problema em conferir', () => {
  const { raiz } = cursoComTresIngeridas();
  assert.deepEqual(novas(raiz).avisos, []);
  const arquivo = join(raiz, 'wiki', 'registro.md');
  writeFileSync(arquivo, `${readFileSync(arquivo, 'utf8')}| 04-x | abc | 2026-11-01 | 1 |\n| 05-y | ${'a'.repeat(64)} | ontem | 1 |\n`);
  const r = novas(raiz);
  assert.equal(r.avisos.length, 2);
  assert.match(r.avisos[0], /04-x/);
  assert.match(r.avisos[0], /linha \d+/);
  const p = conferir(raiz).problemas.filter((x) => x.tipo === 'registro-malformado');
  assert.deepEqual(p.map((x) => x.arquivo), ['wiki/registro.md', 'wiki/registro.md']);
  assert.deepEqual(r.jaRegistradas, ['01-luz', '02.1-canteiro', '03-muda']);
});

// ---- Rodada 4 (review do delta, adjudicado)

const SHA = 'a'.repeat(64);
const comLinha = (raiz, linha) => {
  const arquivo = join(raiz, 'wiki', 'registro.md');
  writeFileSync(arquivo, `${readFileSync(arquivo, 'utf8')}${linha}\n`);
};

test('registrar para com erro claro quando o registro tem linha malformada, e não apaga nada', () => {
  for (const ruim of [
    `| 03-x | ${SHA} | 2026-11-01 | x |`, // bloco que não é número
    `| 03-x | ${'A'.repeat(64)} | 2026-11-01 | 1 |`, // hash em maiúscula
    `| 03-muda | ${SHA} | 2026-11-02 | 2 |`, // linha repetida da aula 03
  ]) {
    const { raiz } = cursoComTresIngeridas();
    comLinha(raiz, ruim);
    aula(raiz, '04-adubo');
    copiar(raiz, '04-adubo');
    pagina(raiz, '04-adubo');
    const antes = readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8');
    assert.throws(() => registrar(raiz, ['04-adubo']), /Corrija a linha \d+ do registro\.md antes de registrar/);
    assert.equal(readFileSync(join(raiz, 'wiki', 'registro.md'), 'utf8'), antes, `o registro ficou como estava (${ruim})`);
    assert.equal(novas(raiz).avisos.length, 1, 'o aviso continua');
  }
});

test('registrar preserva o texto fora da tabela do registro', () => {
  const { raiz } = cursoComTresIngeridas();
  const arquivo = join(raiz, 'wiki', 'registro.md');
  const original = readFileSync(arquivo, 'utf8').replace('Uma linha por aula', 'Nota minha antes da tabela.\n\nUma linha por aula');
  writeFileSync(arquivo, `${original}\nNota minha depois da tabela.\n`);
  aula(raiz, '04-adubo');
  copiar(raiz, '04-adubo');
  pagina(raiz, '04-adubo');
  registrar(raiz, ['04-adubo'], { data: '2026-11-13' });
  const depois = readFileSync(arquivo, 'utf8');
  assert.match(depois, /Nota minha antes da tabela\./);
  assert.match(depois, /Nota minha depois da tabela\./);
  assert.deepEqual([...lerRegistro(raiz).keys()], ['01-luz', '02.1-canteiro', '03-muda', '04-adubo']);
  const linhasTabela = depois.split('\n').filter((l) => /^\| \d/.test(l));
  assert.equal(linhasTabela.length, 4);
  assert.ok(depois.indexOf('| 04-adubo |') < depois.indexOf('Nota minha depois'), 'a linha nova entra na tabela, antes do texto do fim');
  assert.equal(conferir(raiz).ok, true);
});

test('aula com pasta, sem transcricao.md e sem registro: conferir diz que a transcrição sumiu e que ingerir não resolve', () => {
  const { raiz } = cursoComTresIngeridas();
  mkdirSync(join(raiz, 'aulas', '04-adubo'));
  pagina(raiz, '04-adubo');
  const p = conferir(raiz).problemas.filter((x) => x.arquivo === 'aulas/04-adubo.md' && x.tipo !== 'link-quebrado');
  assert.deepEqual(p.map((x) => x.tipo), ['aula-sem-transcricao']);
  assert.match(p[0].detalhe, /transcrição desta aula sumiu/);
  assert.match(p[0].detalhe, /pos-gravacao/);
  assert.match(p[0].detalhe, /ingerir não resolve/);
  assert.doesNotMatch(p[0].detalhe, /Rode a ingestão de novo/);
  aula(raiz, '04-adubo'); // com a transcrição de volta, volta a ser aula interrompida
  assert.ok(conferir(raiz).problemas.some((x) => x.tipo === 'aula-sem-registro'));
});

test('indice ordena "Aulas onde aparece" por itens: sub-item e linha de continuação andam com a aula', () => {
  const raiz = curso();
  aula(raiz, '03-c');
  preparar(raiz);
  pagina(raiz, '03-c');
  const l = (n, p, t) => `- [Aula ${n}](../aulas/${p}.md) [00:10]: ${t}`;
  const linhas = [l(5, '05-y', 'cita'), '  - detalhe da aula 5', l(3, '03-c', 'ensina'), '  continuação da linha da aula 3', l(4, '04-x', 'cita')];
  gravar(raiz, 'wiki/conceitos/a.md', `${cabecalhoConceito('A')}## Aulas onde aparece\n${linhas.join('\n')}\n\n## Avisos de contradição\nNenhum aviso.\n`);
  assert.deepEqual(indice(raiz).reordenados, ['conceitos/a.md']);
  const texto = readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8');
  assert.ok(texto.includes(`## Aulas onde aparece\n${[l(3, '03-c', 'ensina'), '  continuação da linha da aula 3', l(4, '04-x', 'cita'), l(5, '05-y', 'cita'), '  - detalhe da aula 5'].join('\n')}\n\n## Avisos de contradição\nNenhum aviso.`), texto);
  assert.deepEqual(indice(raiz).reordenados, []);
});

test('limparConceitos tira a aula junto com o sub-item e a continuação dela', () => {
  const raiz = curso();
  mkdirSync(join(raiz, 'aulas'));
  preparar(raiz);
  const l = (n, p) => `- [Aula ${n}](../aulas/${p}.md) [00:10]: cita`;
  gravar(raiz, 'wiki/conceitos/a.md', `${cabecalhoConceito('A')}## Aulas onde aparece\n${[l(3, '03-c'), '  - detalhe da 3', l(4, '04-x'), '  continuação da 4', '  - outro detalhe', l(5, '05-y')].join('\n')}\n`);
  const r = limparConceitos(raiz, '04-x');
  assert.deepEqual(r.conceitos.map((c) => [c.removidas, c.restantes]), [[1, 2]]);
  const texto = readFileSync(join(raiz, 'wiki', 'conceitos', 'a.md'), 'utf8');
  assert.doesNotMatch(texto, /04-x|continuação da 4|outro detalhe/);
  assert.match(texto, /detalhe da 3/);
  assert.match(texto, /05-y/);
});
