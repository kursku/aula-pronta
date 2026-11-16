// Guarda das regras da skill pagina-pdf que o texto precisa manter.
// Rodar: node --test skills/pagina-pdf/scripts/skill.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ler = (arquivo) => readFileSync(new URL(arquivo, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const skill = ler('../SKILL.md');
const script = ler('./gerar-material.mjs');

test('allowed-tools: só node no Bash (winget e brew rodam por dentro do script, depois do "sim")', () => {
  const tools = skill.match(/^allowed-tools:[ \t]*(.*)$/m)?.[1].trim();
  assert.equal(tools, 'Read Edit Bash(node:*)');
});

test('instalar o pandoc: pede o "sim" antes e nunca roda winget nem brew direto', () => {
  const pedido = skill.indexOf('espere o "sim"');
  const opcao = skill.indexOf('--instalar-pandoc');
  assert.ok(pedido >= 0 && opcao > pedido, 'o "sim" vem antes de --instalar-pandoc');
  assert.match(skill, /Nunca instale sem o "sim"/);
  assert.match(skill, /nunca rode `winget` nem `brew` você mesmo/);
});

test('sem Typst nem pdftoppm como dependência', () => {
  assert.doesNotMatch(script, /typst|pdftoppm/i);
  assert.doesNotMatch(skill, /typst/i);
});

test('só instala com a opção explícita: o caminho normal não chama winget nem brew', () => {
  const principal = script.slice(script.indexOf('export function gerar('), script.indexOf('function instalarPandoc'));
  assert.doesNotMatch(principal, /winget|brew|instalar/i);
});
