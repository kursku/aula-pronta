#!/usr/bin/env node
// Converte um SRT na transcrição no formato comum do aula-pronta (ver docs/referencia-dos-comandos.md, "Formato da transcrição").
// Uso: node srt-para-transcricao.mjs <gravacao.srt> <transcricao.md>
// Sem dependências. Não sobrescreve uma transcrição que já existe.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TEMPO = /(\d{1,3}):(\d{2}):(\d{2})(?:[,.](\d+))?/;
const LINHA_TEMPO = new RegExp(`^\\s*${TEMPO.source}\\s*-->\\s*${TEMPO.source}`);
// Só formatação de legenda: <i> <b> <u> exatos, <font ...>, seus fechamentos, e tags ASS como {\an8}, {\i1}, {\pos(10,20)}
// (barra, letras e depois dígito ou parêntese). "< 20 graus", "<b e depois c > d", <title>, {\n} e {1} ficam.
const FORMATACAO = /<\/?[ibu]>|<font(?:\s[^<>]*)?>|<\/font>|\{(?:\\[a-z]+(?:\d+|\([^)}]*\)))+\}/gi;

const doisDigitos = (n) => String(n).padStart(2, '0');

// Abaixo de 1 hora: mm:ss. A partir de 1 hora: h:mm:ss.
export function formatarMarca(segundos) {
  const total = Math.floor(segundos);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${doisDigitos(m)}:${doisDigitos(s)}` : `${doisDigitos(m)}:${doisDigitos(s)}`;
}

// ms = dígitos depois da vírgula, lidos como fração de segundo (",5" = 0,5 s; ",1000" = 0,1 s).
const emSegundos = (h, m, s, ms = '0') =>
  Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(`0.${ms}`);

// UTF-16 (com BOM) e UTF-8; UTF-8 inválido cai para windows-1252 em vez de virar "�".
export function decodificar(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

// Devolve [{ inicio, fim, texto }] em segundos. Cada linha de tempo abre um trecho e o texto vai até a
// próxima linha de tempo; linha em branco ou separador torto no meio da fala não perde texto.
export function lerSrt(conteudo) {
  const linhas = conteudo.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const abertos = [];
  let indiceInicial = null; // linha só com número logo antes da primeira linha de tempo
  for (const linha of linhas) {
    const t = linha.match(LINHA_TEMPO);
    if (!t && !abertos.length && linha.trim()) indiceInicial = /^\d+$/.test(linha.trim()) ? Number(linha.trim()) : null;
    if (t) {
      abertos.push({ inicio: emSegundos(t[1], t[2], t[3], t[4]), fim: emSegundos(t[5], t[6], t[7], t[8]), linhas: [] });
    } else if (abertos.length) {
      abertos.at(-1).linhas.push(linha);
    }
  }
  const trechos = [];
  // Decide pela linha crua, antes de descartar as em branco. A última linha do trecho é o índice do próximo
  // bloco se for numérica, colada na próxima linha de tempo (sem linha em branco entre elas) e: a linha antes
  // dela está em branco (separador normal, vale qualquer número, também índice com salto), ou ela vale o
  // índice esperado pela âncora (SRT sem separador). "Passo" / "2" / linha em branco / tempo mantém o 2.
  let ancora = indiceInicial === null ? null : { indice: indiceInicial, pos: 0 };
  abertos.forEach((a, i) => {
    const falas = a.linhas.map((l) => l.replace(FORMATACAO, '').trim()).filter(Boolean);
    const ultima = a.linhas.at(-1)?.trim() ?? '';
    if (i < abertos.length - 1 && /^\d+$/.test(ultima)) {
      const antesEmBranco = a.linhas.length > 1 && a.linhas.at(-2).trim() === '';
      const esperado = ancora !== null && Number(ultima) === ancora.indice + (i + 1 - ancora.pos);
      if (antesEmBranco || esperado) {
        falas.pop();
        ancora = { indice: Number(ultima), pos: i + 1 };
      }
    }
    if (falas.length) trechos.push({ inicio: a.inicio, fim: a.fim, texto: falas.join(' ') });
  });
  return trechos;
}

export function gerarTranscricao(trechos) {
  const fim = trechos.reduce((maior, t) => Math.max(maior, t.fim), 0);
  const corpo = trechos.map((t) => `[${formatarMarca(t.inicio)}] ${t.texto}`);
  return ['# Transcrição', '', `Duração: ${formatarMarca(fim)}`, '', ...corpo, ''].join('\n');
}

function main([entrada, saida]) {
  if (!entrada || !saida) {
    console.error('Uso: node srt-para-transcricao.mjs <gravacao.srt> <transcricao.md>');
    return 2;
  }
  if (!existsSync(entrada)) {
    console.error(`Não encontrei o arquivo ${entrada}.`);
    return 2;
  }
  const trechos = lerSrt(decodificar(readFileSync(entrada)));
  if (trechos.length === 0) {
    console.error(`Não encontrei nenhuma fala em ${entrada}. O arquivo é mesmo um SRT?`);
    return 4;
  }
  try {
    // flag 'wx' falha se o arquivo existe: a transcrição nunca é sobrescrita, sem janela de corrida.
    writeFileSync(saida, gerarTranscricao(trechos), { encoding: 'utf8', flag: 'wx' });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    console.error(`Já existe ${saida}. A transcrição não é sobrescrita.`);
    return 3;
  }
  console.log(`Transcrição gravada em ${saida} (${trechos.length} trechos).`);
  return 0;
}

// realpath dos dois lados: chamado por junction ou symlink, o script ainda roda.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
