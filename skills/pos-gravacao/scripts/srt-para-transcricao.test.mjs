import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodificar, formatarMarca, gerarTranscricao, lerSrt } from './srt-para-transcricao.mjs';

const converter = (srt) => gerarTranscricao(lerSrt(srt));

test('SRT simples vira uma linha por trecho com marca de tempo', () => {
  const srt = '1\n00:00:00,000 --> 00:00:04,000\nOi, pessoal.\n\n2\n00:00:04,500 --> 00:00:09,000\nHoje é sobre luz.\n';
  assert.equal(converter(srt), '# Transcrição\n\nDuração: 00:09\n\n[00:00] Oi, pessoal.\n[00:04] Hoje é sobre luz.\n');
});

test('CRLF e BOM são aceitos', () => {
  const srt = '﻿1\r\n00:00:01,000 --> 00:00:02,000\r\nCom BOM.\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nE CRLF.\r\n';
  const t = lerSrt(srt);
  assert.deepEqual(t.map((x) => x.texto), ['Com BOM.', 'E CRLF.']);
  assert.ok(!converter(srt).includes('\r'));
});

test('bloco com duas linhas de texto vira um trecho só', () => {
  const srt = '1\n00:00:10,000 --> 00:00:14,000\nPrimeira linha\nsegunda linha\n';
  assert.match(converter(srt), /^\[00:10\] Primeira linha segunda linha$/m);
});

test('primeiro bloco sem índice e os seguintes com índice e linha em branco: nenhum índice entra na fala', () => {
  const srt =
    '00:00:05,000 --> 00:00:06,000\nSem índice.\n\n7\n00:00:07,000 --> 00:00:08,000\nUm\n\n8\n00:00:09,000 --> 00:00:10,000\nDois\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['Sem índice.', 'Um', 'Dois']);
});

test('SRT sem índices: trecho que termina em número mantém o número', () => {
  const srt = '00:00:01,000 --> 00:00:02,000\nA resposta é\n42\n\n00:00:03,000 --> 00:00:04,000\nFim.\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['A resposta é 42', 'Fim.']);
});

test('trecho só com 2026 não some, com ou sem índice', () => {
  const sem = '00:00:01,000 --> 00:00:02,000\n2026\n\n00:00:03,000 --> 00:00:04,000\nFim.\n';
  assert.deepEqual(lerSrt(sem).map((x) => x.texto), ['2026', 'Fim.']);
  const com = '1\n00:00:01,000 --> 00:00:02,000\n2026\n\n2\n00:00:03,000 --> 00:00:04,000\nFim.\n';
  assert.deepEqual(lerSrt(com).map((x) => x.texto), ['2026', 'Fim.']);
});

test('SRT com índices: só o índice esperado sai, mesmo se a fala termina em outro número', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nSão 20\n\n2\n00:00:03,000 --> 00:00:04,000\nvale 3\n\n3\n00:00:05,000 --> 00:00:06,000\nFim.\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['São 20', 'vale 3', 'Fim.']);
});

test('índices com salto (1, 9, 10) e linha em branco: nenhum entra na fala', () => {
  const srt =
    '1\n00:00:01,000 --> 00:00:02,000\nUm\n\n9\n00:00:03,000 --> 00:00:04,000\nDois\n\n10\n00:00:05,000 --> 00:00:06,000\nTrês\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['Um', 'Dois', 'Três']);
});

test('"Passo" / "2" / linha em branco / linha de tempo: o 2 é fala e fica', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nPasso\n2\n\n2\n00:00:03,000 --> 00:00:04,000\nFim.\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['Passo 2', 'Fim.']);
  const colado = '1\n00:00:01,000 --> 00:00:02,000\nPasso\n2\n\n00:00:03,000 --> 00:00:04,000\nFim.\n';
  assert.deepEqual(lerSrt(colado).map((x) => x.texto), ['Passo 2', 'Fim.']);
});

test('hora maior que zero usa h:mm:ss e entra na duração', () => {
  const srt = '1\n01:02:03,400 --> 01:02:08,000\nDepois de uma hora.\n';
  const t = converter(srt);
  assert.match(t, /^\[1:02:03\] Depois de uma hora\.$/m);
  assert.match(t, /^Duração: 1:02:08$/m);
});

test('minutos passam de 59 só com hora; marca nunca é arredondada para cima', () => {
  assert.equal(formatarMarca(59.9), '00:59');
  assert.equal(formatarMarca(3599), '59:59');
  assert.equal(formatarMarca(3600), '1:00:00');
});

test('ponto como separador de milissegundos e tags de formatação', () => {
  const srt = '1\n00:00:01.250 --> 00:00:02.500\n<i>Itálico</i> e <font color="red">cor</font>.\n';
  assert.equal(lerSrt(srt)[0].texto, 'Itálico e cor.');
});

test('trecho sem texto é descartado', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\n\n\n2\n00:00:03,000 --> 00:00:04,000\nFala.\n';
  assert.equal(lerSrt(srt).length, 1);
});

test('CLI grava a transcrição e não sobrescreve uma existente', () => {
  const script = fileURLToPath(new URL('./srt-para-transcricao.mjs', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'ap-srt-'));
  const entrada = join(dir, 'gravacao.srt');
  const saida = join(dir, 'transcricao.md');
  writeFileSync(entrada, '1\n00:00:00,000 --> 00:00:03,000\nOlá.\n');

  const primeira = spawnSync(process.execPath, [script, entrada, saida], { encoding: 'utf8' });
  assert.equal(primeira.status, 0);
  assert.match(readFileSync(saida, 'utf8'), /^\[00:00\] Olá\.$/m);

  writeFileSync(saida, 'EDITADO');
  const segunda = spawnSync(process.execPath, [script, entrada, saida], { encoding: 'utf8' });
  assert.equal(segunda.status, 3);
  assert.equal(readFileSync(saida, 'utf8'), 'EDITADO');
});

test('CLI recusa arquivo sem nenhuma fala', () => {
  const script = fileURLToPath(new URL('./srt-para-transcricao.mjs', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'ap-srt-'));
  const entrada = join(dir, 'gravacao.srt');
  writeFileSync(entrada, 'isto não é um SRT\n');
  const r = spawnSync(process.execPath, [script, entrada, join(dir, 'transcricao.md')], { encoding: 'utf8' });
  assert.equal(r.status, 4);
});

const script = fileURLToPath(new URL('./srt-para-transcricao.mjs', import.meta.url));

test('linha em branco dentro do texto não perde fala', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,000\nLinha 1\n\nLinha 2\n\n2\n00:00:04,000 --> 00:00:05,000\nDois\n';
  assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['Linha 1 Linha 2', 'Dois']);
});

test('separador com espaço ou sem separador não cola o índice na fala', () => {
  const comEspaco = '1\n00:00:01,000 --> 00:00:03,000\nUm\n \n2\n00:00:04,000 --> 00:00:05,000\nDois\n';
  const semSeparador = '1\n00:00:01,000 --> 00:00:03,000\nUm\n2\n00:00:04,000 --> 00:00:05,000\nDois\n';
  for (const srt of [comEspaco, semSeparador]) assert.deepEqual(lerSrt(srt).map((x) => x.texto), ['Um', 'Dois']);
});

test('número de fala no meio do trecho é mantido; só o índice antes da próxima linha de tempo sai', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,000\nSão\n20\ngraus\n\n2\n00:00:04,000 --> 00:00:05,000\nFim\n';
  assert.equal(lerSrt(srt)[0].texto, 'São 20 graus');
});

test('"<" e ">" de fala e tags que não são de formatação ficam', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,000\nSe for < 20 graus ou > 30 graus, regue. <title>\n';
  assert.equal(lerSrt(srt)[0].texto, 'Se for < 20 graus ou > 30 graus, regue. <title>');
});

test('< e > soltos em fala de código: só <i> <b> <u> exatos e <font> saem', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nse a <b e depois c > d, e <i>x</i> <bold>\n';
  assert.equal(lerSrt(srt)[0].texto, 'se a <b e depois c > d, e x <bold>');
});

test('chaves faladas em aula de código ficam; tags ASS saem', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nUse {\\n} e {1} e {x} depois {\\an8}{\\i1}ok{\\pos(10,20)}\n';
  assert.equal(lerSrt(srt)[0].texto, 'Use {\\n} e {1} e {x} depois ok');
});

test('tags de formatação e {\an8} saem', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,000\n{\\an8}<b>Negrito</b> <u>sub</u> <font color="#fff">cor</font> <I>it</I>\n';
  assert.equal(lerSrt(srt)[0].texto, 'Negrito sub cor it');
});

test('milissegundos com qualquer número de dígitos são fração de segundo', () => {
  const t = lerSrt('1\n00:00:01,1000 --> 00:00:02,5\nOi\n\n2\n00:00:03,123456 --> 00:00:04,05\nTchau\n');
  assert.equal(t[0].inicio, 1.1);
  assert.equal(t[0].fim, 2.5);
  assert.equal(t[1].inicio, 3.123456);
  assert.equal(t[1].fim, 4.05);
});

test('UTF-16 LE e BE com BOM são decodificados', () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,000\nAção é pão.\n';
  const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(srt, 'utf16le')]);
  const be = Buffer.from(le);
  be.swap16();
  be.writeUInt16BE(0xfeff, 0);
  for (const buf of [le, be]) assert.equal(lerSrt(decodificar(buf))[0].texto, 'Ação é pão.');
});

test('UTF-8 com BOM é aceito e UTF-8 inválido cai para windows-1252', () => {
  assert.equal(decodificar(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('ação')])), 'ação');
  const latin1 = Buffer.from([0x61, 0xe7, 0xe3, 0x6f]); // "ação" em windows-1252, UTF-8 inválido
  assert.equal(decodificar(latin1), 'ação');
});

test('CLI converte SRT em windows-1252 sem "�"', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-srt-'));
  const cab = Buffer.from('1\n00:00:01,000 --> 00:00:02,000\n');
  writeFileSync(join(dir, 'gravacao.srt'), Buffer.concat([cab, Buffer.from([0x61, 0xe7, 0xe3, 0x6f, 0x0a])]));
  const r = spawnSync(process.execPath, [script, join(dir, 'gravacao.srt'), join(dir, 'transcricao.md')], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  const t = readFileSync(join(dir, 'transcricao.md'), 'utf8');
  assert.match(t, /^\[00:01\] ação$/m);
  assert.ok(!t.includes('�'));
});

test('chamado por junction/symlink, o script ainda grava a transcrição', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-srt-'));
  const link = join(dir, 'scripts-link');
  symlinkSync(dirname(script), link, 'junction');
  writeFileSync(join(dir, 'gravacao.srt'), '1\n00:00:01,000 --> 00:00:02,000\nVia link.\n');
  const r = spawnSync(process.execPath, [join(link, 'srt-para-transcricao.mjs'), join(dir, 'gravacao.srt'), join(dir, 'transcricao.md')], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(readFileSync(join(dir, 'transcricao.md'), 'utf8'), /^\[00:01\] Via link\.$/m);
});

test('aula 01 do exemplo: Duração 10:32, marca da fala errada e o dado sensível ficam na transcrição', () => {
  const srt = fileURLToPath(new URL('../../../exemplo/horta-em-casa/aulas/01-luz-e-agua/gravacao.srt', import.meta.url));
  const dir = mkdtempSync(join(tmpdir(), 'ap-srt-'));
  const saida = join(dir, 'transcricao.md');
  const r = spawnSync(process.execPath, [script, srt, saida], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  const t = readFileSync(saida, 'utf8');
  assert.match(t, /^Duração: 10:32$/m);
  assert.match(t, /^\[03:08\] E o detalhe que pouca gente sabe: a fotossíntese acontece principalmente à noite,$/m);
  assert.match(t, /^\[07:42\] .*Rega#Verde7421/m);
  assert.equal(t.split('\n').filter((l) => l.startsWith('[')).length, 56);
});
