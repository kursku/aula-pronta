// Rodar: node --test skills/pagina-pdf/scripts/gerar-material.test.mjs
// Os testes de página precisam do pandoc; o de PDF, do Chrome ou do Edge. Sem eles, esses testes são pulados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { constants as fsConstants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  acharNavegador,
  acharPandoc,
  comandoInstalarPandoc,
  contarPaginas,
  conferirImagens,
  escaparCss,
  gerar as gerarMaterial,
  adquirirTrava,
  liberarTrava,
  imprimirPdf,
  lerConfig,
  montarModelo,
  paginasPorObjeto,
  publicarArquivo,
  entradaPandoc,
  SEM,
  validarCores,
  validarPdf,
} from './gerar-material.mjs';

const SCRIPT = fileURLToPath(new URL('./gerar-material.mjs', import.meta.url));
const MATERIAL_REAL = fileURLToPath(new URL('../../../evals-fixtures/01-luz-e-agua/material.md', import.meta.url));
const TEM_PANDOC = acharPandoc() !== null;
const TEM_NAVEGADOR = acharNavegador() !== null;
const SEM_PANDOC = { skip: !TEM_PANDOC && 'pandoc não instalado' };

const CONFIG = (extra = {}) =>
  Object.entries({
    'nome-do-curso': 'Curso Teste',
    logo: '',
    'cor-principal': '#B5179E',
    'cor-secundaria': '#0F766E',
    rodape: 'Rodapé do Curso Teste',
    ...extra,
  })
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

// 1x1 px, PNG de verdade.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

function criarCurso({ config = CONFIG(), material = readFileSync(MATERIAL_REAL, 'utf8'), arquivos = {} } = {}) {
  const curso = mkdtempSync(join(tmpdir(), 'ap-teste-'));
  const aula = join(curso, 'aulas', '01-luz-e-agua');
  mkdirSync(aula, { recursive: true });
  if (config !== null) writeFileSync(join(curso, 'aula-pronta.config'), config);
  if (material !== null) writeFileSync(join(aula, 'material.md'), material);
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(curso, nome), conteudo);
  return { curso, aula };
}

const rodar = (aula, args = [], env = {}, cwd = dirname(dirname(aula))) =>
  spawnSync(process.execPath, [SCRIPT, aula, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });

const gerar = (aula, opcoes = {}) => gerarMaterial(aula, opcoes);

const texto = (html) =>
  html
    .match(/<main>([\s\S]*)<\/main>/)[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split(/\s+/).filter(Boolean);

// As palavras do Markdown, sem a sintaxe (#, **, |, - de lista, [ ], cerca de código).
const palavras = (md) =>
  md
    .split(/\r?\n/)
    .filter((l) => !/^\s*```/.test(l) && !/^\s*\|[\s|:-]+\|\s*$/.test(l))
    .join(' ')
    .replace(/(^|\s)(#{1,6}|-|\[ \])(?=\s)/g, ' ')
    .replace(/[*|`]/g, ' ')
    .split(/\s+/).filter(Boolean);

test('lerConfig: chave e valor, cor com # é valor, comentário só no começo da linha', () => {
  const c = lerConfig('# comentário\nnome-do-curso: Meu: Curso\nlogo:\ncor-principal: #123ABC\n  # outro comentário\ncor-secundaria:#000000\nrodape: R$ 5 # fim\ndesconhecida: x');
  assert.equal(c['nome-do-curso'], 'Meu: Curso');
  assert.equal(c.logo, '');
  assert.equal(c['cor-principal'], '#123ABC');
  assert.equal(c['cor-secundaria'], '#000000');
  assert.equal(c.rodape, 'R$ 5 # fim');
  assert.equal(c.desconhecida, undefined);
});

test('lerConfig: aspas simétricas saem do valor (o infoprodutor não programa)', () => {
  const c = lerConfig('nome-do-curso: "Curso Chique"\nlogo: \'logo.png\'\nrodape: "só uma"\ncor-principal: "#123ABC"');
  assert.equal(c['nome-do-curso'], 'Curso Chique');
  assert.equal(c.logo, 'logo.png');
  assert.equal(c.rodape, 'só uma');
  assert.equal(c['cor-principal'], '#123ABC');
  assert.equal(lerConfig('nome-do-curso: "aberta')['nome-do-curso'], '"aberta');
  assert.equal(lerConfig('nome-do-curso: "')['nome-do-curso'], '"');
});

test('lerConfig: o que falta cai no visual neutro', () => {
  const c = lerConfig('');
  assert.equal(c['nome-do-curso'], 'Meu Curso');
  assert.equal(c['cor-principal'], '#1F2937');
});

test('validarCores: só #RRGGBB (a cor entra no CSS)', () => {
  validarCores({ 'cor-principal': '#1f2937', 'cor-secundaria': '#ABCDEF' });
  for (const ruim of ['red', '#123', '#12345G', 'red; } body { display: none', '#111111; x']) {
    assert.throws(() => validarCores({ 'cor-principal': ruim, 'cor-secundaria': '#000000' }), /#RRGGBB/);
  }
});

test('montarModelo: nome e rodapé escapados; $ do texto não vira sintaxe do pandoc', () => {
  const m = montarModelo('<b>{{NOME}}</b><style>"{{RODAPE_CSS}}"</style>{{RODAPE}}', {
    config: { 'nome-do-curso': '<script>x</script> R$ 1', rodape: 'a "b" \\ </style><i> $body$' },
    titulo: 't',
    logo: '',
  });
  assert.ok(!m.includes('<script>'));
  assert.ok(!m.includes('</style><i>'));
  assert.ok(m.includes('&lt;script&gt;x&lt;/script&gt; R$$ 1'));
  assert.equal(escaparCss('a"b\\c<d\n'), 'a\\"b\\\\c\\3c d ');
});

test('contarPaginas: o maior /Count manda; sem /Count, conta os objetos /Type /Page (e não /Type /Pages)', () => {
  assert.equal(contarPaginas(Buffer.from('<</Count 3/Kids[1 0 R]/Type/Pages>> <</Type/Page>> <</Type/Page>>')), 3);
  assert.equal(contarPaginas(Buffer.from('<</Type /Pages>> <</Type /Page /X 1>> <</Type/Page>>')), 2);
  assert.equal(paginasPorObjeto(Buffer.from('<</Type /Pages /Count 2>> <</Type /Page /X 1>> <</Type/Page>>')), 2);
});

test('validarPdf: só aceita cabeçalho %PDF- e ao menos uma página', () => {
  assert.deepEqual(validarPdf(Buffer.from('%PDF-1.4 <</Count 2/Type/Pages>>')), { paginas: 2 });
  assert.match(validarPdf(Buffer.from('<html>erro</html> <</Count 2>>')).erro, /não é um PDF/);
  assert.match(validarPdf(Buffer.from('%PDF-1.4 sem páginas')).erro, /sem páginas/);
});

test('comandoInstalarPandoc: winget no Windows, brew no Mac, nada no resto', () => {
  assert.equal(comandoInstalarPandoc('win32')[0], 'winget');
  assert.ok(comandoInstalarPandoc('win32')[1].includes('--disable-interactivity'), 'sem pergunta escondida');
  assert.deepEqual(comandoInstalarPandoc('darwin'), ['brew', ['install', 'pandoc']]);
  assert.equal(comandoInstalarPandoc('linux'), null);
});

test('acharNavegador: Chrome antes do Edge, nos caminhos comuns do Windows; nenhum dá null', () => {
  const pf = mkdtempSync(join(tmpdir(), 'ap-pf-'));
  const env = { ProgramFiles: pf, 'ProgramFiles(x86)': pf, LOCALAPPDATA: pf };
  assert.equal(acharNavegador(env, 'win32'), null);
  const edge = join(pf, 'Microsoft', 'Edge', 'Application');
  mkdirSync(edge, { recursive: true });
  writeFileSync(join(edge, 'msedge.exe'), '');
  assert.equal(acharNavegador(env, 'win32'), join(edge, 'msedge.exe'));
  const chrome = join(pf, 'Google', 'Chrome', 'Application');
  mkdirSync(chrome, { recursive: true });
  writeFileSync(join(chrome, 'chrome.exe'), '');
  assert.equal(acharNavegador(env, 'win32'), join(chrome, 'chrome.exe'));
});

test('sem pandoc: para com exit 5, explica e não gera nada', () => {
  const { aula } = criarCurso();
  const r = rodar(aula, [], { AULA_PRONTA_PANDOC: join(tmpdir(), 'nao-existe', 'pandoc') });
  assert.equal(r.status, 5);
  assert.match(r.stderr, /Falta o pandoc/);
  assert.equal(existsSync(join(aula, 'material.html')), false);
});

test('sem Chrome nem Edge: exit 6, explica, e a página web já saiu', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  const r = rodar(aula, [], { AULA_PRONTA_NAVEGADOR: join(tmpdir(), 'nao-existe', 'chrome') });
  assert.equal(r.status, 6);
  assert.match(r.stderr, /Chrome e o Microsoft Edge/);
  assert.ok(existsSync(join(aula, 'material.html')));
  assert.equal(existsSync(join(aula, 'material.pdf')), false);
});

test('navegador que falha: exit 7, e o PDF e a página da rodada anterior não ficam na pasta', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  writeFileSync(join(aula, 'material.pdf'), 'pdf antigo');
  writeFileSync(join(aula, 'material.html'), 'página antiga');
  // o node recusa as opções do Chrome e sai com erro sem imprimir nada
  const r = rodar(aula, [], { AULA_PRONTA_NAVEGADOR: process.execPath });
  assert.equal(r.status, 7);
  assert.match(r.stderr, /não conseguiu imprimir o PDF/);
  assert.equal(readFileSync(join(aula, 'material.pdf'), 'utf8'), 'pdf antigo');
  assert.equal(readFileSync(join(aula, 'material.html'), 'utf8'), 'página antiga');
});

test('navegador falha na primeira execução: não imprime página inexistente', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  const r = rodar(aula, [], { AULA_PRONTA_NAVEGADOR: process.execPath });
  assert.equal(r.status, 7);
  assert.match(r.stderr, /não conseguiu imprimir o PDF/);
  assert.doesNotMatch(r.stdout, /Página:/);
  assert.equal(existsSync(join(aula, 'material.html')), false);
});

test('falha de ambiente (sem pandoc, cor ou logo inválido) não apaga o que já estava pronto', SEM_PANDOC, () => {
  const velhos = (aula) => {
    writeFileSync(join(aula, 'material.pdf'), 'pdf antigo');
    writeFileSync(join(aula, 'material.html'), 'página antiga');
  };
  const intactos = (aula) =>
    assert.deepEqual([readFileSync(join(aula, 'material.pdf'), 'utf8'), readFileSync(join(aula, 'material.html'), 'utf8')], ['pdf antigo', 'página antiga']);
  const a = criarCurso();
  velhos(a.aula);
  assert.equal(rodar(a.aula, [], { AULA_PRONTA_PANDOC: join(tmpdir(), 'nada', 'pandoc') }).status, 5);
  intactos(a.aula);
  const b = criarCurso({ config: CONFIG({ 'cor-principal': 'vermelho' }) });
  velhos(b.aula);
  assert.equal(rodar(b.aula).status, 2);
  intactos(b.aula);
  const c = criarCurso({ config: CONFIG({ logo: 'nao-existe.png' }) });
  velhos(c.aula);
  assert.equal(rodar(c.aula).status, 2);
  intactos(c.aula);
});

test('sem navegador (exit 6): a página nova sai e o PDF velho não fica para trás', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  writeFileSync(join(aula, 'material.pdf'), 'pdf antigo');
  writeFileSync(join(aula, 'material.html'), 'página antiga');
  assert.equal(rodar(aula, [], { AULA_PRONTA_NAVEGADOR: join(tmpdir(), 'nada', 'chrome') }).status, 6);
  assert.equal(existsSync(join(aula, 'material.pdf')), false);
  assert.match(readFileSync(join(aula, 'material.html'), 'utf8'), /Curso Teste/);
});

test('--so-pagina troca a página e não toca no PDF', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  writeFileSync(join(aula, 'material.pdf'), 'pdf antigo');
  writeFileSync(join(aula, 'material.html'), 'página antiga');
  assert.equal(rodar(aula, ['--so-pagina']).status, 0);
  assert.equal(readFileSync(join(aula, 'material.pdf'), 'utf8'), 'pdf antigo');
  assert.match(readFileSync(join(aula, 'material.html'), 'utf8'), /Curso Teste/);
});

test('destino PDF que não é arquivo: não toca página antiga', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  writeFileSync(join(aula, 'material.html'), 'página antiga');
  mkdirSync(join(aula, 'material.pdf')); // uma pasta no lugar do PDF: o rmSync recusa, como um PDF aberto no Windows
  assert.throws(
    () => gerar(aula, {
      env: { AULA_PRONTA_NAVEGADOR: process.execPath },
      imprimir: ({ saida }) => {
        writeFileSync(saida, Buffer.from('%PDF-1.4 <</Count 1/Type/Pages>>'));
        return 1;
      },
    }),
    (e) => e.codigo === 2 && /Não consegui apagar material\.pdf/.test(e.message),
  );
  assert.equal(readFileSync(join(aula, 'material.html'), 'utf8'), 'página antiga');
});

test('destino HTML inválido é conferido antes de publicar PDF novo', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  mkdirSync(join(aula, 'material.html'));
  writeFileSync(join(aula, 'material.pdf'), 'pdf antigo');
  assert.throws(
    () => gerar(aula, {
      env: { AULA_PRONTA_NAVEGADOR: process.execPath },
      imprimir: ({ saida }) => {
        writeFileSync(saida, Buffer.from('%PDF-1.4 <</Count 1/Type/Pages>>'));
        return 1;
      },
    }),
    /Não consegui apagar material\.html/,
  );
  assert.equal(readFileSync(join(aula, 'material.pdf'), 'utf8'), 'pdf antigo');
});

test('falta material.md ou config: para com instrução', () => {
  const a = criarCurso({ material: null });
  assert.match(rodar(a.aula).stderr, /pos-gravacao/);
  const b = criarCurso({ config: null });
  assert.match(rodar(b.aula).stderr, /iniciar/);
  assert.equal(rodar(b.aula).status, 2);
});

test('só trabalha em aulas/NN-nome', () => {
  const { curso } = criarCurso();
  assert.throws(() => gerar(curso, { soPagina: true }), /não é uma pasta de aula/);
});

test('a pasta da aula precisa ser filha real de aulas do curso', (t) => {
  const { curso } = criarCurso();
  const fora = mkdtempSync(join(tmpdir(), 'ap-aula-fora-'));
  writeFileSync(join(fora, 'material.md'), '# Aula 1: Fora\n');
  const atalho = join(curso, 'aulas', '01-atalho');
  try {
    symlinkSync(fora, atalho, 'junction');
  } catch (e) {
    return t.skip('sem permissão para junction (' + e.code + ')');
  }
  assert.throws(() => gerar(atalho, { soPagina: true }), /precisa ficar dentro de aulas/);
});

test('a pasta da aula não pode ser junction para outra aula', (t) => {
  const curso = mkdtempSync(join(tmpdir(), 'ap-aulas-'));
  const aulas = join(curso, 'aulas');
  const primeira = join(aulas, '01-a');
  const segunda = join(aulas, '02-b');
  mkdirSync(segunda, { recursive: true });
  writeFileSync(join(curso, 'aula-pronta.config'), CONFIG());
  writeFileSync(join(segunda, 'material.md'), '# Aula 2: B\n');
  try {
    symlinkSync(segunda, primeira, 'junction');
  } catch (e) {
    return t.skip('sem permissão para junction (' + e.code + ')');
  }
  assert.throws(() => gerar(primeira, { soPagina: true }), /precisa ser uma pasta de aula real dentro de aulas\./);
});

test('aceita aula quando junction está num ancestral do curso', SEM_PANDOC, (t) => {
  const { curso } = criarCurso();
  const envelope = mkdtempSync(join(tmpdir(), 'ap-ancestral-'));
  const atalho = join(envelope, 'pai');
  try {
    symlinkSync(dirname(curso), atalho, 'junction');
  } catch (e) {
    return t.skip('sem permissão para junction (' + e.code + ')');
  }
  const aula = join(atalho, curso.split(/[\\/]/).pop(), 'aulas', '01-luz-e-agua');
  assert.doesNotThrow(() => gerar(aula, { soPagina: true }));
  assert.ok(existsSync(join(curso, 'aulas', '01-luz-e-agua', 'material.html')));
});

test('aula inexistente explica que precisa ficar dentro de aulas', () => {
  const { curso } = criarCurso();
  const aula = join(curso, 'aulas', '01-inexistente');
  assert.throws(() => gerar(aula, { soPagina: true }), /precisa ficar dentro de aulas/);
});

test('aceita aula quando o cwd difere da pasta do curso', SEM_PANDOC, () => {
  const { curso, aula } = criarCurso();
  assert.equal(rodar(aula, ['--so-pagina'], {}, dirname(curso)).status, 0);
});

test('Windows aceita caixa diferente no caminho real', SEM_PANDOC, (t) => {
  if (process.platform !== 'win32') return t.skip('caixa de caminho só difere no Windows');
  const { aula } = criarCurso();
  assert.doesNotThrow(() => gerarMaterial(aula.toLowerCase(), { soPagina: true }));
});

test('material.md por link simbólico para fora da aula é recusado', (t) => {
  if (process.platform === 'win32') return t.skip('link simbólico de arquivo exige privilégio no Windows');
  const { aula } = criarCurso();
  const fora = join(mkdtempSync(join(tmpdir(), 'ap-material-fora-')), 'segredo.md');
  writeFileSync(fora, '# Segredo fora da aula\n');
  rmSync(join(aula, 'material.md'));
  symlinkSync(fora, join(aula, 'material.md'));
  assert.throws(() => gerar(aula, { soPagina: true }), /material\.md.*dentro da pasta da aula/);
});

test('marca da configuração aparece na página: nome, cores, rodapé e logo embutido', SEM_PANDOC, () => {
  const { aula } = criarCurso({ config: CONFIG({ logo: 'logo.png' }), arquivos: { 'logo.png': PNG } });
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.match(html, /<span class="curso">Curso Teste<\/span>/);
  assert.match(html, /--principal: #B5179E;/);
  assert.match(html, /--secundaria: #0F766E;/);
  assert.match(html, /<footer class="rodape">Rodapé do Curso Teste<\/footer>/);
  assert.match(html, /content: "Rodapé do Curso Teste"/);
  assert.ok(html.includes(`<img src="data:image/png;base64,${PNG.toString('base64')}"`));
  assert.doesNotMatch(html, /logo\.png/);
});

test('página única: sem recurso externo, com CSS próprio, viewport e CSP', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.doesNotMatch(html, /<link\b|<script\b|<iframe\b|@import|url\(|(src|href)="https?:/i);
  assert.match(html, /<style>/);
  assert.match(html, /name="viewport"/);
  // O pandoc reescreve as aspas do atributo como &#39;: o navegador lê o mesmo valor.
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1].replaceAll('&#39;', "'");
  assert.equal(csp, "default-src 'none'; img-src data:; style-src 'unsafe-inline'");
});

test('logo vazio: sem imagem na página', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  gerar(aula, { soPagina: true });
  assert.doesNotMatch(readFileSync(join(aula, 'material.html'), 'utf8'), /<img/);
});

test('logo ausente, de outro tipo ou fora da pasta do curso: para com mensagem', SEM_PANDOC, () => {
  const ausente = criarCurso({ config: CONFIG({ logo: 'logo.png' }) });
  assert.throws(() => gerar(ausente.aula, { soPagina: true }), /Não encontrei o logo/);
  const tipo = criarCurso({ config: CONFIG({ logo: 'logo.txt' }), arquivos: { 'logo.txt': 'x' } });
  assert.throws(() => gerar(tipo.aula, { soPagina: true }), /png, jpg, jpeg, gif/);
  const fora = criarCurso({ config: CONFIG({ logo: '../fora.png' }) });
  assert.throws(() => gerar(fora.aula, { soPagina: true }), /dentro da pasta do curso/);
});

test('logo com aspas no config funciona; nome que começa com ".." é só um nome de arquivo', SEM_PANDOC, () => {
  const a = criarCurso({ config: CONFIG({ logo: '"logo.png"', 'nome-do-curso': '"Curso Chique"' }), arquivos: { 'logo.png': PNG } });
  gerar(a.aula, { soPagina: true });
  const html = readFileSync(join(a.aula, 'material.html'), 'utf8');
  assert.match(html, /<span class="curso">Curso Chique<\/span>/);
  assert.match(html, /<img src="data:image\/png/);
  const b = criarCurso({ config: CONFIG({ logo: '..logo.png' }), arquivos: { '..logo.png': PNG } });
  gerar(b.aula, { soPagina: true });
  assert.match(readFileSync(join(b.aula, 'material.html'), 'utf8'), /<img src="data:image\/png/);
});

test('logo que é pasta: mensagem em português, sem erro cru do Node', SEM_PANDOC, () => {
  const { aula, curso } = criarCurso({ config: CONFIG({ logo: 'logo.png' }) });
  mkdirSync(join(curso, 'logo.png'));
  const r = rodar(aula);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /precisa ser um arquivo de imagem/);
  assert.doesNotMatch(r.stderr, /EISDIR|node:internal/);
});

test('logo por link simbólico que aponta para fora da pasta do curso é recusado', SEM_PANDOC, (t) => {
  const fora = join(mkdtempSync(join(tmpdir(), 'ap-fora-')), 'segredo.png');
  writeFileSync(fora, PNG);
  const { aula, curso } = criarCurso({ config: CONFIG({ logo: 'logo.png' }) });
  try {
    symlinkSync(fora, join(curso, 'logo.png'));
  } catch (e) {
    return t.skip('sem permissão para link simbólico (' + e.code + ')');
  }
  assert.throws(() => gerar(aula, { soPagina: true }), /dentro da pasta do curso/);
});

test('cor inválida na configuração: para antes de gerar', SEM_PANDOC, () => {
  const { aula } = criarCurso({ config: CONFIG({ 'cor-principal': 'red; } * { display: none' }) });
  assert.throws(() => gerar(aula, { soPagina: true }), /#RRGGBB/);
  assert.equal(existsSync(join(aula, 'material.html')), false);
});

test('marca com HTML e $ no nome e no rodapé sai como texto', SEM_PANDOC, () => {
  const { aula } = criarCurso({ config: CONFIG({ 'nome-do-curso': 'A <script>alert(1)</script> $body$', rodape: 'R$ 5 </style><b>x</b>' }) });
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.doesNotMatch(html, /<script|<b>x|<\/style><b>/);
  assert.match(html, /A &lt;script&gt;alert\(1\)&lt;\/script&gt; \$body\$/);
  assert.match(html, /R\$ 5 &lt;\/style&gt;&lt;b&gt;x&lt;\/b&gt;/);
});

test('HTML cru do material vira texto, não HTML', SEM_PANDOC, () => {
  const material = [
    '# Aula 1: Teste',
    '',
    'Digite <tag> e <b>negrito</b> no terminal.',
    '',
    '<script>window.PWNED = 1</script>',
    '',
    '<div onclick="x()">caixa</div>',
    '',
    '<img src=x onerror="alert(1)">',
    '',
    'Texto com <span onclick="y()">trecho</span> no meio.',
    '',
    '::: {onclick=z}',
    'bloco',
    ':::',
    '',
    '[outro](https://exemplo.com){onclick=q}',
    '',
    '<!-- comentário -->',
    '',
    '```',
    '<html><body>código</body></html>',
    '```',
    '',
    'Um [link](javascript:alert(1)) e R$ 50 e R$ 70.',
    '',
  ].join('\n');
  const { aula } = criarCurso({ material });
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  const corpo = html.match(/<main>([\s\S]*)<\/main>/)[1];
  assert.doesNotMatch(corpo, /<(tag|b|script|div|img|html|body)\b/i);
  assert.doesNotMatch(corpo, /<!--/);
  assert.match(corpo, /&lt;tag&gt; e &lt;b&gt;negrito&lt;\/b&gt;/);
  assert.match(corpo, /&lt;script&gt;window\.PWNED = 1&lt;\/script&gt;/);
  assert.match(corpo, /&lt;img src=x onerror=(&quot;|")alert\(1\)(&quot;|")&gt;/);
  assert.match(corpo, /R\$ 50 e R\$ 70/);
});

test('o texto da página é o do material.md (mesmo conteúdo, sem perder nem inventar)', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.deepEqual(texto(html), palavras(readFileSync(MATERIAL_REAL, 'utf8')));
});

test('gerar de novo sobrescreve a página (é derivada do material.md)', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  gerar(aula, { soPagina: true });
  writeFileSync(join(aula, 'material.md'), '# Aula 1: Outro\n\nTexto novo.\n');
  gerar(aula, { soPagina: true });
  assert.match(readFileSync(join(aula, 'material.html'), 'utf8'), /Texto novo/);
});

test('PDF de verdade: cabeçalho, páginas por duas fontes e faixa esperada para o material real', { skip: (!TEM_PANDOC || !TEM_NAVEGADOR) && 'pandoc ou navegador ausente' }, () => {
  const { aula } = criarCurso();
  const r = gerar(aula);
  const pdf = readFileSync(r.pdf);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  // /Count e objetos /Page são fontes independentes; o material da aula 1 ocupa 3 páginas A4 (2 a 4 aceita fonte e navegador).
  assert.equal(r.paginas, paginasPorObjeto(pdf));
  assert.ok(r.paginas >= 2 && r.paginas <= 4, 'páginas: ' + r.paginas);
});

test('instalar o pandoc só roda com a opção explícita (gerar nunca instala)', () => {
  const { aula } = criarCurso();
  const r = rodar(aula, [], { AULA_PRONTA_PANDOC: join(tmpdir(), 'nao-existe', 'pandoc'), PATH: '' });
  assert.equal(r.status, 5);
  assert.doesNotMatch(r.stdout + r.stderr, /winget|brew/i);
});

// --- Entrada do pandoc: cada extensão desligada em SEM tem um caso que dá errado sem ela.
const pandocReal = () => acharPandoc();
const renderizar = (md, sem) =>
  spawnSync(pandocReal(), ['-f', entradaPandoc(sem), '-t', 'html5'], { input: md, encoding: 'utf8' }).stdout;

const CASOS_SEM = {
  raw_html: { md: '<b>x</b> y', ruim: (h) => h.includes('<b>x</b>') },
  raw_tex: { md: 'a \\textbf{x} b', ruim: (h) => !h.includes('\\textbf{x}') },
  raw_attribute: { md: '```{=html}\n<script>x</script>\n```', ruim: (h) => h.includes('<script>x</script>') },
  tex_math_dollars: { md: 'a $x+1$ b', ruim: (h) => h.includes('class="math') },
  yaml_metadata_block: { md: 'a\n\n---\ntitle: Sumiu\n---\n\nb', ruim: (h) => !h.includes('Sumiu') },
  smart: { md: 'Ele disse "oi" -- ok...', ruim: (h) => h.includes('“') },
  native_divs: { md: '<div onclick="x()">caixa</div>', ruim: (h) => h.includes('<div onclick') },
  native_spans: { md: 'a <span onclick="x()">s</span> b', ruim: (h) => h.includes('<span onclick') },
  fenced_divs: { md: '::: {onclick=z}\nbloco\n:::', ruim: (h) => h.includes('<div onclick') },
  bracketed_spans: { md: '[txt]{onclick=x}', ruim: (h) => h.includes('<span onclick') },
  link_attributes: { md: '[l](http://a.com){onclick=x}', ruim: (h) => /<a [^>]*onclick/.test(h) },
  header_attributes: { md: '# Título {onclick=x}', ruim: (h) => h.includes('<h1 onclick') },
  fenced_code_attributes: { md: '```{.js onclick=x}\ncodigo\n```', ruim: (h) => h.includes('onclick="x"') },
  inline_code_attributes: { md: '`a`{onclick=x}', ruim: (h) => h.includes('<code onclick') },
  citations: { md: 'veja [@fulano2020, p. 3]', ruim: (h) => h.includes('class="citation"') },
  superscript: { md: 'x^2^', ruim: (h) => h.includes('<sup>') },
  subscript: { md: 'H~2~O', ruim: (h) => h.includes('<sub>') },
  line_blocks: { md: '| linha um\n| linha dois', ruim: (h) => h.includes('line-block') },
  definition_lists: { md: 'Termo\n:   definição', ruim: (h) => h.includes('<dl>') },
  fancy_lists: { md: 'a) um\nb) dois', ruim: (h) => h.includes('<ol type="a"') },
  pandoc_title_block: { md: '% Título\n% Autor\n\ncorpo', ruim: (h) => !h.includes('% Título') },
  inline_notes: { md: 'texto^[nota inline]', ruim: (h) => h.includes('footnote-ref') },
};

test('SEM: toda extensão desligada tem um caso, e o caso falha quando só ela volta a ligar (teste de mutação)', SEM_PANDOC, () => {
  assert.deepEqual(Object.keys(CASOS_SEM).sort(), [...SEM].sort(), 'cada item de SEM precisa de um caso, e só deles');
  for (const [ext, { md, ruim }] of Object.entries(CASOS_SEM)) {
    assert.equal(ruim(renderizar(md, SEM)), false, `${ext}: a página saiu errada com SEM completo`);
    assert.equal(ruim(renderizar(md, SEM.filter((e) => e !== ext))), true, `${ext}: o caso não detecta a extensão ligada`);
  }
});

test('material hostil com atributos e blocos crus: nenhum on*= em tag e nenhum <script na página', SEM_PANDOC, () => {
  const material = [
    '# Aula 1: Hostil {onclick=alert(1)}',
    '',
    '[link](https://exemplo.com){onclick=alert(1)} e [trecho]{onclick=alert(1)} e `cod`{onclick=alert(1)}',
    '',
    '```{.js onclick=alert(1)}',
    'codigo()',
    '```',
    '',
    '```{=html}',
    '<script>alert(1)</script>',
    '```',
    '',
    '::: {onclick=alert(1)}',
    'bloco',
    ':::',
    '',
    '<span onclick="alert(1)">span</span> <div onclick="alert(1)">div</div>',
    '',
  ].join('\n');
  const { aula } = criarCurso({ material });
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.doesNotMatch(html, /<[a-z][^>]*\son\w+\s*=/i);
  assert.doesNotMatch(html, /<script/i);
});

test('% título, ^[nota] e [^1]: o texto fica na página (nada some, nada vira nota solta)', SEM_PANDOC, () => {
  const material = '% Título do bloco\n% Autor do bloco\n\n# Aula 1: Notas\n\nTexto^[nota inline] com outra nota[^1].\n\n[^1]: nota de rodapé\n';
  const { aula } = criarCurso({ material });
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.match(html, /% Título do bloco/);
  assert.match(html, /\^\[nota inline\]/);
  assert.match(html, /nota de rodapé/);
});

test('imagem da pasta da aula entra embutida; a página não aponta para arquivo nenhum', SEM_PANDOC, () => {
  const { aula } = criarCurso({ material: '# Aula 1: Imagem\n\n![diagrama](esquema.png)\n' });
  writeFileSync(join(aula, 'esquema.png'), PNG);
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.ok(html.includes(`src="data:image/png;base64,${PNG.toString('base64')}"`));
  assert.doesNotMatch(html, /esquema\.png/);
});

test('imagem remota, absoluta, fora da pasta ou inexistente: para com mensagem, sem imagem quebrada', SEM_PANDOC, () => {
  const tenta = (alvo) => {
    const { aula } = criarCurso({ material: `# Aula 1: Imagem\n\n![x](${alvo})\n` });
    assert.throws(() => gerar(aula, { soPagina: true }), /imagem/i, alvo);
    assert.equal(existsSync(join(aula, 'material.html')), false, alvo);
  };
  tenta('https://exemplo.com/x.png');
  tenta('http://127.0.0.1/x.png');
  tenta('//exemplo.com/x.png');
  tenta('C:/Windows/Web/x.png');
  tenta('/etc/x.png');
  tenta('../x.png');
  tenta('sub/../../x.png');
  tenta('%2e%2e/x.png');
  tenta('naoexiste.png');
});

test('imagem relativa para aula irmã é recusada claramente', SEM_PANDOC, () => {
  const { curso, aula } = criarCurso({ material: '# Aula 1: Imagem\n\n![x](../01-intro/foto.png)\n' });
  const irma = join(curso, 'aulas', '01-intro');
  mkdirSync(irma, { recursive: true });
  writeFileSync(join(irma, 'foto.png'), PNG);
  assert.throws(() => gerar(aula, { soPagina: true }), /fora da pasta da aula|dentro da pasta da aula/);
});

test('imagem com extensão em pasta diz que não é arquivo', SEM_PANDOC, () => {
  const { aula } = criarCurso({ material: '# Aula 1: Imagem\n\n![x](pasta.png)\n' });
  mkdirSync(join(aula, 'pasta.png'));
  assert.throws(() => gerar(aula, { soPagina: true }), /não é um arquivo regular/);
});

test('link com esquema que não seja http, https, mailto ou # perde o link e fica o texto', SEM_PANDOC, () => {
  const material = [
    '# Aula 1: Links',
    '',
    '[Abrir](javascript:alert(1)) [Maiúscula](JaVaScRiPt:alert(1)) [Dados](data:text/html,x) [Arquivo](file:///c:/x) [VB](vbscript:x) <javascript:alert(2)>',
    '',
    '[ok](https://a.com) [mail](mailto:a@b.c) [ancora](#parte-1) [Autolink](<https://b.com>)',
    '',
  ].join('\n');
  const { aula } = criarCurso({ material });
  gerar(aula, { soPagina: true });
  const corpo = readFileSync(join(aula, 'material.html'), 'utf8').match(/<main>([\s\S]*)<\/main>/)[1];
  assert.doesNotMatch(corpo, /href="(javascript|vbscript|data|file):/i);
  for (const texto of ['Abrir', 'Maiúscula', 'Dados', 'Arquivo', 'VB']) assert.match(corpo, new RegExp(texto));
  assert.match(corpo, /<a href="https:\/\/a\.com">ok<\/a>/);
  assert.match(corpo, /<a href="mailto:a@b\.c">mail<\/a>/);
  assert.match(corpo, /<a href="#parte-1">ancora<\/a>/);
});

test('link sem esquema que não seja âncora vira texto (../transcricao.md, ./x, x.md, /x, //host/x); âncora e esquemas permitidos seguem links', SEM_PANDOC, () => {
  const material = [
    '# Aula 1: Links relativos',
    '',
    '[Transcr](../transcricao.md) [Mat](./material.md) [Pag](pagina.html) [Raiz](/x) [Proto](//exemplo.com/x) [Vazio]()',
    '',
    '[Parte](#parte-1) [Seguro](https://a.com/x) [Mail](mailto:a@b.c)',
    '',
  ].join('\n');
  const { aula } = criarCurso({ material });
  gerar(aula, { soPagina: true });
  const corpo = readFileSync(join(aula, 'material.html'), 'utf8').match(/<main>([\s\S]*)<\/main>/)[1];
  assert.deepEqual([...corpo.matchAll(/href="([^"]*)"/g)].map((m) => m[1]), ['#parte-1', 'https://a.com/x', 'mailto:a@b.c']);
  for (const texto of ['Transcr', 'Mat', 'Pag', 'Raiz', 'Proto', 'Vazio']) assert.match(corpo, new RegExp(texto));
});

test('lerConfig: aspas só saem quando o valor inteiro é um par sem outra aspa igual dentro', () => {
  assert.equal(lerConfig('rodape: "Curso A" e "B"').rodape, '"Curso A" e "B"');
  assert.equal(lerConfig("rodape: 'a' e 'b'").rodape, "'a' e 'b'");
  assert.equal(lerConfig('rodape: "Curso d\'A"').rodape, "Curso d'A");
  assert.equal(lerConfig('rodape: "Curso A"').rodape, 'Curso A');
  assert.equal(lerConfig('rodape: ""').rodape, '');
});

test('contarPaginas: com dois /Count diferentes vale o maior, em qualquer ordem', () => {
  assert.equal(contarPaginas(Buffer.from('<</Count 1>> <</Count 3/Type/Pages>>')), 3);
  assert.equal(contarPaginas(Buffer.from('<</Count 3/Type/Pages>> <</Count 1>>')), 3);
});

test('logo fora da pasta do curso por junction/link de pasta é recusado (roda no Windows e no Linux)', SEM_PANDOC, () => {
  const fora = mkdtempSync(join(tmpdir(), 'ap-fora-'));
  writeFileSync(join(fora, 'segredo.png'), PNG);
  const { aula, curso } = criarCurso({ config: CONFIG({ logo: 'atalho/segredo.png' }) });
  symlinkSync(fora, join(curso, 'atalho'), 'junction'); // no Windows 'junction' não pede privilégio
  assert.throws(() => gerar(aula, { soPagina: true }), /dentro da pasta do curso/);
});

test('só arquivo de imagem vira imagem: pdf, mp4, mp3, txt, o próprio material.md e data: que não é imagem param com o nome do arquivo', SEM_PANDOC, () => {
  for (const alvo of ['nao.pdf', 'nao.mp4', 'nao.mp3', 'nao.txt', 'notes.txt', 'material.md', 'sem-extensao', 'data:text/html,x']) {
    const { aula } = criarCurso({ material: `# Aula 1: Tipo\n\n![x](${alvo})\n` });
    writeFileSync(join(aula, 'notes.txt'), 'SEGREDO-DA-PASTA');
    assert.throws(() => gerar(aula, { soPagina: true }), (e) => /não é uma imagem que a página aceita/.test(e.message) && e.message.includes(alvo), alvo);
    assert.equal(existsSync(join(aula, 'material.html')), false, alvo);
  }
});

test('extensão de imagem sem diferenciar maiúscula, e data:image/ também', SEM_PANDOC, () => {
  const b64 = PNG.toString('base64');
  const { aula } = criarCurso({ material: `# Aula 1: Maiúscula\n\n![a](Foto.PNG)\n\n![b](DATA:IMAGE/PNG;base64,${b64})\n` });
  writeFileSync(join(aula, 'Foto.PNG'), PNG);
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.equal((html.match(/<img[^>]+src="data:image\/png/gi) ?? []).length, 2);
});

// --- imprimirPdf com falhas injetadas (sem navegador real)
const PDF_FALSO = Buffer.from('%PDF-1.4 <</Count 2/Type/Pages>>');
const gravaPdf = (conteudo, status = 0) => (_nav, args) => {
  const alvo = args.find((a) => a.startsWith('--print-to-pdf=')).slice('--print-to-pdf='.length);
  if (conteudo) writeFileSync(alvo, conteudo);
  return { status, stderr: '' };
};

test('imprimirPdf: PDF válido volta com o número de páginas', () => {
  const saida = join(mkdtempSync(join(tmpdir(), 'ap-pdf-')), 'material.pdf');
  assert.equal(imprimirPdf({ navegador: 'chrome', pagina: join(tmpdir(), 'x.html'), saida }, { executar: gravaPdf(PDF_FALSO) }), 2);
  assert.deepEqual(readFileSync(saida), PDF_FALSO);
  assert.equal(existsSync(`${saida}.tmp`), false);
});

test('imprimirPdf: navegador com exit diferente de zero recusa PDF válido', () => {
  const saida = join(mkdtempSync(join(tmpdir(), 'ap-pdf-')), 'material.pdf');
  assert.throws(
    () => imprimirPdf({ navegador: 'chrome', pagina: join(tmpdir(), 'x.html'), saida }, { executar: gravaPdf(PDF_FALSO, 1) }),
    (e) => e.codigo === 7 && /saída 1/.test(e.message),
  );
  assert.equal(existsSync(saida), false);
});

test('imprimirPdf: PDF aberto em outro programa (EBUSY na cópia): mensagem em português', () => {
  const saida = join(mkdtempSync(join(tmpdir(), 'ap-pdf-')), 'material.pdf');
  const copiar = () => {
    throw Object.assign(new Error('busy'), { code: 'EBUSY' });
  };
  assert.throws(
    () => imprimirPdf({ navegador: 'chrome', pagina: 'x.html', saida }, { executar: gravaPdf(PDF_FALSO), copiar }),
    /Não consegui gravar material\.pdf \(EBUSY\).*feche e rode de novo/,
  );
  assert.equal(existsSync(`${saida}.tmp`), false);
});

test('publicarArquivo: erro ao renomear mantém destino e remove temporário', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-publicar-'));
  const origem = join(pasta, 'origem');
  const destino = join(pasta, 'material.html');
  writeFileSync(origem, 'novo');
  writeFileSync(destino, 'antigo');
  assert.throws(
    () => publicarArquivo(origem, destino, { renomear: () => { throw Object.assign(new Error('permission'), { code: 'EPERM' }); } }),
    (e) => e.codigo === 7 && /Não consegui gravar material\.html \(EPERM\).*feche e rode de novo/.test(e.message),
  );
  assert.equal(readFileSync(destino, 'utf8'), 'antigo');
  assert.deepEqual(readdirSync(pasta).sort(), ['material.html', 'origem']);
});

test('publicarArquivo: .tmp que já existe na pasta não é seguido nem sobrescrito', (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-publicar-'));
  const fora = mkdtempSync(join(tmpdir(), 'ap-fora-'));
  const alvo = join(fora, 'alheio.txt');
  writeFileSync(alvo, 'alheio');
  const origem = join(pasta, 'origem');
  const destino = join(pasta, 'material.html');
  writeFileSync(origem, 'novo');
  try {
    symlinkSync(alvo, `${destino}.tmp`, 'file');
  } catch (e) {
    if (e.code === 'EPERM') return t.skip('sem permissão para link simbólico de arquivo');
    throw e;
  }
  publicarArquivo(origem, destino);
  assert.equal(readFileSync(destino, 'utf8'), 'novo');
  assert.equal(readFileSync(alvo, 'utf8'), 'alheio');
});

test('publicarArquivo: cria o temporário com COPYFILE_EXCL e nome único', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-publicar-'));
  const origem = join(pasta, 'origem');
  const destino = join(pasta, 'material.html');
  writeFileSync(origem, 'novo');
  let visto;
  publicarArquivo(origem, destino, { copiar: (de, para, modo) => { visto = { para, modo }; copyFileSync(de, para, modo); } });
  assert.equal(visto.modo, fsConstants.COPYFILE_EXCL);
  assert.notEqual(visto.para, `${destino}.tmp`);
  assert.equal(readFileSync(destino, 'utf8'), 'novo');
});

test('imprimirPdf: navegador que passa de 2 minutos', () => {
  const executar = () => ({ error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), stderr: '' });
  assert.throws(() => imprimirPdf({ navegador: 'chrome', pagina: 'x.html', saida: 'y.pdf' }, { executar }), /demorou mais de 2 minutos/);
});

test('imprimirPdf: saída que não é PDF, sem páginas ou ausente', () => {
  const tenta = (executar) => assert.throws(() => imprimirPdf({ navegador: 'chrome', pagina: 'x.html', saida: 'y.pdf' }, { executar }), (e) => e.codigo === 7);
  tenta(gravaPdf(Buffer.from('<html>erro</html>')));
  tenta(gravaPdf(Buffer.from('%PDF-1.4 sem páginas')));
  tenta(gravaPdf(null));
});

test('imagem do material por junction/link de pasta para fora da aula: para e o conteúdo de fora não aparece (Windows e Linux)', SEM_PANDOC, () => {
  const fora = mkdtempSync(join(tmpdir(), 'ap-fora-'));
  writeFileSync(join(fora, 'privada.png'), PNG);
  const { aula } = criarCurso({ material: '# Aula 1: Atalho\n\n![x](atalho/privada.png)\n' });
  symlinkSync(fora, join(aula, 'atalho'), 'junction'); // no Windows 'junction' não pede privilégio
  assert.throws(() => gerar(aula, { soPagina: true }), /aponta, por atalho ou link, para um arquivo fora da pasta da aula/);
  assert.equal(existsSync(join(aula, 'material.html')), false);
});

test('imagem em subpasta de verdade e atalho que continua dentro da aula seguem funcionando', SEM_PANDOC, () => {
  const { aula } = criarCurso({ material: '# Aula 1: Dentro\n\n![a](sub/a.png)\n\n![b](apelido/a.png)\n' });
  mkdirSync(join(aula, 'sub'));
  writeFileSync(join(aula, 'sub', 'a.png'), PNG);
  symlinkSync(join(aula, 'sub'), join(aula, 'apelido'), 'junction');
  gerar(aula, { soPagina: true });
  const html = readFileSync(join(aula, 'material.html'), 'utf8');
  assert.equal((html.match(/<img[^>]+src="data:image\/png/g) ?? []).length, 2);
});

test('gerar usa cópia da imagem feita antes de ela mudar', SEM_PANDOC, () => {
  const { aula } = criarCurso({ material: '# Aula 1: Imagem\n\n![a](imagem.png)\n' });
  const origem = join(aula, 'imagem.png');
  writeFileSync(origem, PNG);
  gerar(aula, {
    soPagina: true,
    onAfterCopy: () => writeFileSync(origem, 'trocada depois da conferência'),
  });
  assert.ok(readFileSync(join(aula, 'material.html'), 'utf8').includes(`data:image/png;base64,${PNG.toString('base64')}`));
});

test('arquivo especial com extensão de imagem é recusado antes do pandoc', SEM_PANDOC, (t) => {
  if (process.platform === 'win32') return t.skip('FIFO não existe no Windows');
  const { aula } = criarCurso({ material: '# Aula 1: FIFO\n\n![a](fifo.png)\n' });
  const fifo = join(aula, 'fifo.png');
  const r = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.throws(() => gerar(aula, { soPagina: true }), /não é um arquivo regular/);
});

test('duas gerações da mesma aula não usam a mesma trava', () => {
  const { aula } = criarCurso();
  const liberar = adquirirTrava(aula);
  try {
    assert.throws(() => adquirirTrava(aula), /outra geração/);
  } finally {
    liberar();
  }
});

test('gerar recupera trava com processo morto', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  const trava = join(aula, '.aula-pronta.lock');
  mkdirSync(trava);
  writeFileSync(join(trava, 'estado.json'), JSON.stringify({ pid: 2147483647, criadoEm: Date.now() }));
  gerar(aula, { soPagina: true });
  assert.equal(existsSync(trava), false);
  assert.ok(existsSync(join(aula, 'material.html')));
});

test('gerar recupera trava sem hora, futura ou velha mesmo com PID vivo', SEM_PANDOC, () => {
  for (const estado of [{ pid: process.pid }, { pid: process.pid, criadoEm: Date.now() + 1_000_000 }, { pid: process.pid, criadoEm: Date.now() - 300_000 }]) {
    const { aula } = criarCurso();
    const trava = join(aula, '.aula-pronta.lock');
    mkdirSync(trava);
    writeFileSync(join(trava, 'estado.json'), JSON.stringify(estado));
    gerar(aula, { soPagina: true });
    assert.equal(existsSync(trava), false);
  }
});

test('trava abandonada: rename que perde corrida vira outra geração', () => {
  const { aula } = criarCurso();
  const trava = join(aula, '.aula-pronta.lock');
  mkdirSync(trava);
  writeFileSync(join(trava, 'estado.json'), JSON.stringify({ pid: 2147483647, criadoEm: Date.now() }));
  let chamado = false;
  assert.throws(
    () => adquirirTrava(aula, { renomear: () => {
      chamado = true;
      throw Object.assign(new Error('perdeu a corrida'), { code: 'ENOENT' });
    } }),
    /outra geração/,
  );
  assert.equal(chamado, true);
});

test('gerar sempre libera trava quando execução falha', SEM_PANDOC, () => {
  const { aula } = criarCurso();
  assert.throws(() => gerar(aula, { soPagina: true, onAfterCopy: () => { throw new Error('falha forçada'); } }), /falha forçada/);
  assert.equal(existsSync(join(aula, '.aula-pronta.lock')), false);
});

test('liberarTrava avisa quando não consegue remover a trava', () => {
  const trava = join(mkdtempSync(join(tmpdir(), 'ap-lock-')), '.aula-pronta.lock');
  mkdirSync(trava);
  const mensagens = [];
  const original = console.error;
  console.error = (mensagem) => mensagens.push(mensagem);
  try {
    liberarTrava(trava, () => { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); });
  } finally {
    console.error = original;
  }
  assert.match(mensagens[0], new RegExp(trava.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(mensagens[0], /EBUSY/);
});
