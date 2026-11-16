// Guarda da regra "o plugin nunca envia nada": a skill lote só pode pré-aprovar Read e Write.
// Rodar: node --test skills/lote/scripts/allowed-tools.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';

test('lote só pré-aprova Read e Write (sem Bash, rede nem MCP)', () => {
  assert.equal(frontmatter.match(/^allowed-tools:[ \t]*(.*)$/m)?.[1].trim(), 'Read Write');
});

test('lote diz que nunca envia e usa os dois marcadores', () => {
  assert.match(skill, /Nunca envia e-mail nem mensagem/);
  assert.match(skill, /\{\{nome_do_aluno\}\}/);
  assert.match(skill, /\{\{link_do_curso\}\}/);
});
