// Os graders de Write dos casos escopo-*: só o caminho exato <algo>/wiki/escopo.md conta como o escopo.
// Rodar: node --test "skills/escopo-do-curso/scripts/*.test.mjs"
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const casos = [
  ...readdirSync(join(raiz, 'evals')).filter((n) => n.startsWith('escopo-')).map((n) => join('evals', n)),
  join('evals-wsl', 'escopo-sem-script'),
].filter((c) => existsSync(join(raiz, c, 'graders', 'grava-o-escopo-com-write.md')));

const inputMatch = (caso, nome) => {
  const texto = readFileSync(join(raiz, caso, 'graders', `${nome}.md`), 'utf8');
  return new RegExp(texto.match(/^input_match: '(.*)'$/m)[1].replace(/''/g, "'"));
};

// O que o grader enxerga é o JSON do input da tool: no Windows a barra invertida chega escapada (\\).
const entrada = (caminho, separador) => `{"file_path":"${caminho.replaceAll('/', separador === '\\' ? '\\\\' : '/')}","content":"# Escopo"}`;

// [caminho, conta como escopo (positivo passa), é escrita em outro arquivo (negativo reprova)]
const amostras = [
  ['/r/wiki/escopo.md', true, false],
  ['C:/r/wiki/escopo.md', true, false],
  ['wiki/escopo.md', true, false],
  ['/r/wiki/notas-escopo.md', false, true],
  ['/r/wiki/rascunho/escopo.md', false, true],
  ['/r/escopo.md', false, true],
  ['/r/wiki/escopo.md.bak', false, true],
  ['/r/wiki/aulas/03-plantando-as-mudas.md', false, true],
  ['/r/awiki/escopo.md', false, true],
];

test('há casos escopo-* com o grader de Write para conferir', () => {
  assert.ok(casos.length >= 6, `achei só ${casos.length}`);
});

for (const caso of casos) {
  for (const separador of ['/', '\\']) {
    test(`${caso}: Write só no caminho wiki/escopo.md (separador ${separador})`, () => {
      const positivo = inputMatch(caso, 'grava-o-escopo-com-write');
      const negativo = inputMatch(caso, 'nao-grava-outro-arquivo-com-write');
      for (const [caminho, conta, outro] of amostras) {
        const json = entrada(caminho, separador);
        assert.equal(positivo.test(json), conta, `positivo, ${caminho}: ${json}`);
        assert.equal(negativo.test(json), outro, `negativo, ${caminho}: ${json}`);
      }
    });
  }
}
