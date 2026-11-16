// A fixture dos casos de eval do escopo recusa variante desconhecida e não monta nada.
// Rodar: node --test "skills/escopo-do-curso/scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../../evals-fixtures/montar-wiki-escopo.sh', import.meta.url));
const temBash = spawnSync('bash', ['-c', 'true']).status === 0;

for (const variante of ['bobagem', '']) {
  test(`montar-wiki-escopo.sh recusa a variante ${JSON.stringify(variante)} e não monta nada`, { skip: !temBash && 'sem bash' }, () => {
    const pasta = mkdtempSync(join(tmpdir(), 'ap-escopo-fixture-'));
    const r = spawnSync('bash', [script, ...(variante ? [variante] : [])], { cwd: pasta, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /montar-wiki-escopo/);
    assert.deepEqual(readdirSync(pasta), []);
  });
}
