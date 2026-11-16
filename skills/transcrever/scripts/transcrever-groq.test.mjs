// Rodar: node --test "skills/transcrever/scripts/*.test.mjs"
// Nenhum teste chama o Groq de verdade: o serviço é uma função `fetch` falsa ou um servidor HTTP local.
// Os testes de corte precisam do ffmpeg; sem ele, são pulados.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { gerarTranscricao } from '../../pos-gravacao/scripts/srt-para-transcricao.mjs';
import * as modulo from './transcrever-groq.mjs';
import {
  duracaoWav,
  enviarParte,
  estimarCusto,
  gravarAtomico,
  lerEnv,
  paraTrechos,
  planejarPartes,
  redigir,
  textoDoCusto,
  TENTATIVAS,
  transcrever,
  urlDoServico,
} from './transcrever-groq.mjs';

const SCRIPT = fileURLToPath(new URL('./transcrever-groq.mjs', import.meta.url));
const CHAVE = 'gsk_FICTICIA_nao_e_uma_chave_real_0123456789';
const TEM_FFMPEG = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0 && spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
const SEM_FFMPEG = { skip: !TEM_FFMPEG && 'ffmpeg não instalado' };

// WAV 16 bits mono. `ruido` = amostras pseudoaleatórias (quase não comprimem em FLAC); senão, silêncio.
function wav(segundos, { taxa = 16000, ruido = false } = {}) {
  const n = Math.round(segundos * taxa);
  const dados = Buffer.alloc(n * 2);
  let x = 12345;
  if (ruido) for (let i = 0; i < n; i++) dados.writeInt16LE(((x = (x * 1103515245 + 12345) & 0x7fffffff) >> 8) % 20000 - 10000, i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0, 'latin1');
  h.writeUInt32LE(36 + dados.length, 4);
  h.write('WAVEfmt ', 8, 'latin1');
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(taxa, 24);
  h.writeUInt32LE(taxa * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36, 'latin1');
  h.writeUInt32LE(dados.length, 40);
  return Buffer.concat([h, dados]);
}

// Pasta de curso fictícia com aulas/01-aula-teste/gravacao.wav; `env` = conteúdo do .env (ou null: sem arquivo).
function curso({ segundos = 5, env = `GROQ_API_KEY=${CHAVE}\n`, ruido = false } = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'ap-teste-'));
  const aula = join(raiz, 'aulas', '01-aula-teste');
  mkdirSync(aula, { recursive: true });
  writeFileSync(join(aula, 'gravacao.wav'), wav(segundos, { ruido }));
  if (env !== null) writeFileSync(join(raiz, '.env'), env);
  return { raiz, aula, transcricao: join(aula, 'transcricao.md') };
}

const resposta = (status, corpo, cabecalhos = {}) =>
  new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), { status, headers: cabecalhos });
const segs = (...textos) => ({ segments: textos.map((text, i) => ({ start: i * 3 + 1.9, end: i * 3 + 3, text })) });

// Roda o comando em processo, com fetch falso. Devolve a saída, o código e os eventos em ordem.
async function rodar(c, argumentos, { fetchImpl, env = {} } = {}) {
  const eventos = [];
  const saida = [];
  const codigo = await transcrever([c.aula, ...argumentos], {
    cwd: c.raiz,
    env,
    esperar: async () => {},
    log: (t) => (saida.push(t), eventos.push(`log:${t}`)),
    fetchImpl: async (...a) => (eventos.push('fetch'), fetchImpl(...a)),
  });
  return { codigo, saida: saida.join('\n'), eventos };
}

function arquivosDe(pasta, achados = []) {
  for (const e of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) arquivosDe(caminho, achados);
    else achados.push(caminho);
  }
  return achados;
}

// ---------- .env, chave, URL ----------

test('lerEnv lê aspas, export, comentário e CRLF; sem .env devolve vazio', () => {
  const c = curso({ env: `# comentário\r\nexport GROQ_API_KEY="${CHAVE}" # nota\r\nOUTRA = 'x y'\r\nvazia=\r\n` });
  const v = lerEnv(c.raiz);
  assert.equal(v.GROQ_API_KEY, CHAVE);
  assert.equal(v.OUTRA, 'x y');
  assert.equal(v.vazia, '');
  assert.deepEqual(lerEnv(curso({ env: null }).raiz), {});
});

test('redigir troca a chave por [chave] em todas as ocorrências', () => {
  assert.equal(redigir(`a ${CHAVE} b ${CHAVE}`, CHAVE), 'a [chave] b [chave]');
  assert.equal(redigir('sem chave', ''), 'sem chave');
});

test('urlDoServico só aceita o Groq ou um servidor local', () => {
  assert.match(urlDoServico(undefined), /^https:\/\/api\.groq\.com\//);
  assert.equal(urlDoServico('http://127.0.0.1:9999/x'), 'http://127.0.0.1:9999/x');
  assert.throws(() => urlDoServico('https://example.com/roubar'), /só pode apontar/);
  assert.throws(() => urlDoServico('http://api.groq.com.example.com/x'), /só pode apontar/);
  assert.throws(() => urlDoServico('não é url'), /não é uma URL/);
});

// ---------- duração e custo ----------

test('duracaoWav lê a duração pelo cabeçalho', () => {
  const c = curso({ segundos: 7.5 });
  assert.equal(duracaoWav(join(c.aula, 'gravacao.wav')), 7.5);
});

test('estimarCusto: turbo custa US$ 0,04 por hora e cobra no mínimo 10 s', () => {
  assert.equal(estimarCusto(3600).dolares, 0.04);
  assert.equal(estimarCusto(3600, 'whisper-large-v3').dolares, 0.111);
  assert.equal(estimarCusto(2).cobrados, 10);
  assert.throws(() => estimarCusto(60, 'outro-modelo'), /Modelo desconhecido/);
  assert.match(textoDoCusto(3600, 'whisper-large-v3-turbo'), /US\$ 0,04 .*13\/11\/2026/);
});

test('texto do custo geral não afirma que cada parte é um envio', () => {
  assert.doesNotMatch(textoDoCusto(100, 'whisper-large-v3-turbo'), /cada parte é um envio/);
});

// ---------- cortes ----------

test('planejarPartes: cabe inteiro ou corta em partes seguidas que cobrem tudo', () => {
  assert.deepEqual(planejarPartes(100, 1000, 5000), [{ inicio: 0, duracao: 100 }]);
  const p = planejarPartes(1000, 50_000_000, 24_000_000);
  assert.ok(p.length >= 3);
  assert.equal(p[0].inicio, 0);
  p.slice(1).forEach((x, i) => assert.equal(x.inicio, p[i].inicio + p[i].duracao));
  assert.equal(p.at(-1).inicio + p.at(-1).duracao, 1000);
});

test('paraTrechos soma o início da parte e descarta segmento vazio', () => {
  const t = paraTrechos([{ start: 1, end: 2, text: '  olá\n mundo ' }, { start: 3, end: 4, text: '  ' }], 600);
  assert.deepEqual(t, [{ inicio: 601, fim: 602, texto: 'olá mundo' }]);
});

test('paraTrechos descarta tempos negativos e intervalos sem duração positiva', () => {
  let descartados = 0;
  const t = paraTrechos([
    { start: 1, end: 2, text: 'válido' },
    { start: -1, end: 1, text: 'início negativo' },
    { start: 2, end: 2, text: 'duração zero' },
    { start: 3, end: 2, text: 'fim antes do início' },
  ], 0, () => descartados++);
  assert.deepEqual(t, [{ inicio: 1, fim: 2, texto: 'válido' }]);
  assert.equal(descartados, 3);
});

// ---------- repetição de falhas ----------

const par = (fetchImpl, extra = {}) => {
  const esperas = [];
  const chamadas = [];
  const f = async (...a) => (chamadas.push(a), fetchImpl(chamadas.length, ...a));
  return { esperas, chamadas, chamar: () => enviarParte({ dados: Buffer.from('x'), nome: 'a.wav', chave: CHAVE, modelo: 'm', url: 'http://127.0.0.1:1/x', fetchImpl: f, esperar: async (ms) => esperas.push(ms), ...extra }) };
};

test('429 e 5xx são repetidos e depois dá certo; Retry-After manda na espera', async () => {
  const t = par((n) => {
    if (n === 1) return resposta(429, 'devagar', { 'retry-after': '7' });
    if (n === 2) return resposta(503, 'fora');
    return resposta(200, segs('ok'));
  });
  const s = await t.chamar();
  assert.equal(s[0].text, 'ok');
  assert.equal(t.chamadas.length, 3);
  assert.deepEqual(t.esperas, [7000, 2000]);
});

test('falha de rede é repetida', async () => {
  const t = par((n) => {
    if (n === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
    return resposta(200, segs('ok'));
  });
  assert.equal((await t.chamar())[0].text, 'ok');
  assert.equal(t.chamadas.length, 2);
});

test('falha temporária que não passa para depois do limite de tentativas, com mensagem clara', async () => {
  const t = par(() => resposta(500, 'erro interno'));
  await assert.rejects(t.chamar(), (e) => /depois de 4 tentativas/.test(e.message) && /Não gravei nada/.test(e.message) && e.codigo === 6);
  assert.equal(t.chamadas.length, TENTATIVAS);
  assert.equal(t.esperas.length, TENTATIVAS - 1);
});

test('401 e 400 são definitivos: uma chamada só, sem repetir, com mensagem clara e sem a chave', async () => {
  for (const [status, esperado] of [[401, /recusou a chave \(401\)/], [400, /recusou o envio \(400\)/]]) {
    const t = par(() => resposta(status, { error: { message: `inválido: ${CHAVE}` } }));
    await assert.rejects(t.chamar(), (e) => esperado.test(e.message) && !e.message.includes(CHAVE));
    assert.equal(t.chamadas.length, 1);
    assert.equal(t.esperas.length, 0);
  }
});

test('o servidor recebe a chave só no cabeçalho Authorization', async () => {
  const t = par(() => resposta(200, segs('ok')));
  await t.chamar();
  const [, init] = t.chamadas[0];
  assert.equal(init.headers.Authorization, `Bearer ${CHAVE}`);
  assert.ok(![...init.body.values()].some((v) => typeof v === 'string' && v.includes(CHAVE)));
});

// ---------- o comando inteiro, com serviço simulado ----------

test('com chave: áudio curto vira transcrição no formato comum', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(200, segs('Olá, pessoal.', 'Bem-vindos à aula.')) });
  assert.equal(r.codigo, 0, r.saida);
  const texto = readFileSync(c.transcricao, 'utf8');
  assert.equal(texto, gerarTranscricao([{ inicio: 1.9, fim: 3, texto: 'Olá, pessoal.' }, { inicio: 4.9, fim: 6, texto: 'Bem-vindos à aula.' }]));
  assert.match(texto, /^# Transcrição\n\nDuração: 00:06\n\n\[00:01\] Olá, pessoal\.\n\[00:04\] Bem-vindos à aula\.\n$/);
});

test('o custo aparece antes da chamada ao serviço', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(200, segs('ok')) });
  const custo = r.eventos.findIndex((e) => e.startsWith('log:Custo estimado'));
  const chamada = r.eventos.indexOf('fetch');
  assert.ok(custo >= 0 && chamada > custo, JSON.stringify(r.eventos));
});

test('sem --transcrever só estima: nenhuma chamada e nenhum arquivo', async () => {
  const c = curso();
  const antes = arquivosDe(c.raiz);
  const r = await rodar(c, [], { fetchImpl: () => assert.fail('não pode chamar o serviço') });
  assert.equal(r.codigo, 0);
  assert.match(r.saida, /Custo estimado: US\$ 0,0001 \(5 s de áudio/);
  assert.match(r.saida, /Nada foi enviado ao Groq/);
  assert.deepEqual(arquivosDe(c.raiz), antes);
});

test('sem chave (sem .env, .env sem a linha ou chave vazia): para, explica e não cria arquivo', async () => {
  for (const env of [null, 'OUTRA=1\n', 'GROQ_API_KEY=\n']) {
    const c = curso({ env });
    const antes = arquivosDe(c.raiz);
    for (const args of [[], ['--transcrever']]) {
      const r = await rodar(c, args, { fetchImpl: () => assert.fail('não pode chamar o serviço') });
      assert.equal(r.codigo, 3);
      assert.match(r.saida, /GROQ_API_KEY=cole-a-chave-aqui/);
      assert.match(r.saida, /console\.groq\.com\/keys/);
      assert.ok(!r.eventos.includes('fetch'));
      assert.deepEqual(arquivosDe(c.raiz), antes);
    }
  }
});

test('falha definitiva no serviço: para com mensagem clara e não grava transcrição', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(401, { error: { message: `bad key ${CHAVE}` } }) });
  assert.equal(r.codigo, 6);
  assert.match(r.saida, /recusou a chave \(401\)/);
  assert.equal(existsSync(c.transcricao), false);
});

test('falha temporária que passa na segunda tentativa grava a transcrição', async () => {
  const c = curso();
  let n = 0;
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => (++n === 1 ? resposta(503, 'x') : resposta(200, segs('ok'))) });
  assert.equal(r.codigo, 0, r.saida);
  assert.ok(existsSync(c.transcricao));
});

test('a chave não aparece na saída nem em arquivo gerado (sucesso, erro com eco da chave e temporários)', async () => {
  const antesTmp = readdirSync(tmpdir()).filter((n) => n.startsWith('aula-pronta-')).length;
  const saidas = [];
  for (const fetchImpl of [
    () => resposta(200, segs('ok')),
    () => resposta(401, { error: { message: `Invalid API Key: ${CHAVE}` } }),
    () => resposta(400, `eco da chave ${CHAVE}`),
    () => resposta(500, CHAVE),
  ]) {
    const c = curso();
    const r = await rodar(c, ['--transcrever'], { fetchImpl });
    saidas.push(r.saida);
    for (const f of arquivosDe(c.raiz).filter((x) => !x.endsWith('.env'))) {
      assert.ok(!readFileSync(f).includes(CHAVE), `chave em ${f}`);
    }
  }
  for (const s of saidas) assert.ok(!s.includes(CHAVE) && !s.includes('gsk_'));
  assert.equal(readdirSync(tmpdir()).filter((n) => n.startsWith('aula-pronta-')).length, antesTmp, 'pasta temporária ficou para trás');
});

test('transcrição que já existe não é sobrescrita e nada é chamado', async () => {
  const c = curso();
  writeFileSync(c.transcricao, 'minha transcrição');
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(r.codigo, 3);
  assert.equal(readFileSync(c.transcricao, 'utf8'), 'minha transcrição');
});

test('pasta fora de aulas/ é recusada', async () => {
  const c = curso();
  const fora = join(c.raiz, 'outra');
  mkdirSync(fora);
  writeFileSync(join(fora, 'gravacao.wav'), wav(2));
  const codigo = await transcrever([fora], { cwd: c.raiz, env: {}, log: () => {}, fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(codigo, 2);
});

test('--curso sem valor ou seguido de outra opção mostra uso e não grava arquivo', async () => {
  const c = curso();
  for (const argumentos of [['--curso'], ['--curso', '--transcrever']]) {
    const saida = [];
    const codigo = await transcrever([c.aula, ...argumentos], {
      cwd: c.raiz,
      env: {},
      log: (t) => saida.push(t),
      fetchImpl: () => assert.fail('não pode chamar'),
    });
    assert.equal(codigo, 2, argumentos.join(' '));
    assert.match(saida.join('\n'), /Uso: node transcrever-groq\.mjs/);
    assert.equal(existsSync(c.transcricao), false);
  }
});

test('--modelo sem valor nas duas ordens mostra uso e não grava arquivo', async () => {
  const c = curso();
  for (const argumentos of [['--modelo'], ['--modelo', '--transcrever'], ['--transcrever', '--modelo']]) {
    const saida = [];
    const codigo = await transcrever([c.aula, ...argumentos], {
      cwd: c.raiz,
      env: {},
      log: (t) => saida.push(t),
      fetchImpl: () => assert.fail('não pode chamar'),
    });
    assert.equal(codigo, 2, argumentos.join(' '));
    assert.match(saida.join('\n'), /Uso: node transcrever-groq\.mjs <pasta-da-aula> \[--transcrever\] \[--curso <pasta>\] \[--modelo <id>\]/);
    assert.equal(existsSync(c.transcricao), false);
  }
});

test('pasta sem gravação: explica o nome do arquivo', async () => {
  const c = curso();
  const vazia = join(c.raiz, 'aulas', '02-vazia');
  mkdirSync(vazia);
  const saida = [];
  const codigo = await transcrever([vazia], { cwd: c.raiz, env: {}, log: (t) => saida.push(t) });
  assert.equal(codigo, 2);
  assert.match(saida.join(''), /gravacao\.mp4/);
});

test('o serviço devolve sem fala: não grava', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(200, { segments: [{ start: 0, end: 1, text: ' ' }] }) });
  assert.equal(r.codigo, 6);
  assert.equal(existsSync(c.transcricao), false);
});

// ---------- corte com ffmpeg ----------

test('áudio acima do limite é cortado e a transcrição sai inteira e em ordem', SEM_FFMPEG, async () => {
  const c = curso({ segundos: 40, ruido: true });
  const tamanhos = [];
  const eventos = [];
  const r = await transcrever([c.aula, '--transcrever'], {
    cwd: c.raiz,
    env: { AULA_PRONTA_LIMITE_BYTES: '300000' },
    esperar: async () => {},
    log: (t) => eventos.push(t),
    fetchImpl: async (_url, init) => {
      tamanhos.push(init.body.get('file').size);
      return resposta(200, segs(`parte ${tamanhos.length}`));
    },
  });
  assert.equal(r, 0, eventos.join('\n'));
  assert.ok(tamanhos.length >= 3, `partes: ${tamanhos.length}`);
  assert.ok(tamanhos.every((t) => t <= 300000));
  const linhas = readFileSync(c.transcricao, 'utf8').split('\n').filter((l) => l.startsWith('['));
  assert.equal(linhas.length, tamanhos.length);
  assert.deepEqual(linhas.map((l) => l.replace(/^\[[\d:]+\] /, '')), tamanhos.map((_, i) => `parte ${i + 1}`));
  const marcas = linhas.map((l) => l.match(/^\[(?:(\d+):)?(\d+):(\d+)\]/).slice(1)).map(([h = 0, m, s]) => Number(h) * 3600 + Number(m) * 60 + Number(s));
  marcas.slice(1).forEach((m, i) => assert.ok(m > marcas[i], 'marcas fora de ordem'));
  assert.ok(marcas.at(-1) < 40 && marcas.at(-1) > 20, `última marca ${marcas.at(-1)}`);
  assert.ok(eventos.some((e) => /Enviando a parte 1 de/.test(e)));
});

test('falha numa parte do meio não deixa transcrição parcial', SEM_FFMPEG, async () => {
  const c = curso({ segundos: 40, ruido: true });
  let n = 0;
  const codigo = await transcrever([c.aula, '--transcrever'], {
    cwd: c.raiz,
    env: { AULA_PRONTA_LIMITE_BYTES: '300000' },
    esperar: async () => {},
    log: () => {},
    fetchImpl: async () => (++n === 2 ? resposta(400, { error: { message: 'ruim' } }) : resposta(200, segs('ok'))),
  });
  assert.equal(codigo, 6);
  assert.equal(existsSync(c.transcricao), false);
});

test('sem ffmpeg e arquivo grande: pede para instalar, sem instalar nada', async () => {
  const c = curso({ segundos: 5 });
  const saida = [];
  const codigo = await transcrever([c.aula, '--transcrever'], {
    cwd: c.raiz,
    env: { AULA_PRONTA_LIMITE_BYTES: '1000' },
    log: (t) => saida.push(t),
    executarFerramenta: () => ({ error: Object.assign(new Error('x'), { code: 'ENOENT' }) }),
    fetchImpl: () => assert.fail('não pode chamar'),
  });
  assert.equal(codigo, 5);
  assert.match(saida.join('\n'), /Falta o ffmpeg.*winget install ffmpeg.*brew install ffmpeg.*Não instalei nada/);
  assert.equal(existsSync(c.transcricao), false);
});

// ---------- linha de comando de verdade, contra um servidor HTTP local ----------

function servidor(tratar) {
  const pedidos = [];
  const s = createServer((req, res) => {
    const pedaco = [];
    req.on('data', (d) => pedaco.push(d));
    req.on('end', () => {
      pedidos.push({ autorizacao: req.headers.authorization, corpo: Buffer.concat(pedaco).length });
      tratar(req, res, pedidos.length);
    });
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok({ pedidos, url: `http://127.0.0.1:${s.address().port}/openai/v1/audio/transcriptions`, fechar: () => s.close() })));
}

function processo(args, env, cwd) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [SCRIPT, ...args], { cwd, env: { ...process.env, ...env } });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (codigo) => ok({ codigo, out }));
  });
}

test('linha de comando: estima sem chamar; com --transcrever grava; a chave vai só no cabeçalho', async () => {
  const s = await servidor((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(segs('Falei isto.')));
  });
  try {
    const c = curso();
    const a = await processo([c.aula, '--curso', c.raiz], { AULA_PRONTA_GROQ_URL: s.url }, c.raiz);
    assert.equal(a.codigo, 0, a.out);
    assert.match(a.out, /Custo estimado/);
    assert.equal(s.pedidos.length, 0);
    assert.equal(existsSync(c.transcricao), false);

    const b = await processo([c.aula, '--curso', c.raiz, '--transcrever'], { AULA_PRONTA_GROQ_URL: s.url }, c.raiz);
    assert.equal(b.codigo, 0, b.out);
    assert.equal(s.pedidos.length, 1);
    assert.equal(s.pedidos[0].autorizacao, `Bearer ${CHAVE}`);
    assert.match(readFileSync(c.transcricao, 'utf8'), /^# Transcrição\n\nDuração: 00:03\n\n\[00:01\] Falei isto\.\n$/);
    assert.ok(!a.out.includes(CHAVE) && !b.out.includes(CHAVE));
  } finally {
    s.fechar();
  }
});

test('linha de comando: 401 do servidor, com eco da chave, para sem vazar e sem arquivo', async () => {
  const s = await servidor((_req, res) => {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: { message: `Invalid key ${CHAVE}` } }));
  });
  try {
    const c = curso();
    const r = await processo([c.aula, '--curso', c.raiz, '--transcrever'], { AULA_PRONTA_GROQ_URL: s.url }, c.raiz);
    assert.equal(r.codigo, 6);
    assert.match(r.out, /recusou a chave/);
    assert.ok(!r.out.includes(CHAVE));
    assert.equal(s.pedidos.length, 1);
    assert.equal(existsSync(c.transcricao), false);
  } finally {
    s.fechar();
  }
});

test('linha de comando: 429 repetido até esgotar usa a espera configurada e termina', async () => {
  const s = await servidor((_req, res) => {
    res.statusCode = 429;
    res.end('devagar');
  });
  try {
    const c = curso();
    const r = await processo([c.aula, '--curso', c.raiz, '--transcrever'], { AULA_PRONTA_GROQ_URL: s.url, AULA_PRONTA_ESPERA_MS: '1' }, c.raiz);
    assert.equal(r.codigo, 6);
    assert.equal(s.pedidos.length, TENTATIVAS);
    assert.match(r.out, /depois de 4 tentativas/);
  } finally {
    s.fechar();
  }
});

test('linha de comando: o .env pode apontar a URL de teste, e URL de fora é recusada antes de enviar', async () => {
  const c = curso({ env: `GROQ_API_KEY=${CHAVE}\nAULA_PRONTA_GROQ_URL=https://example.com/x\n` });
  const r = await processo([c.aula, '--curso', c.raiz, '--transcrever'], {}, c.raiz);
  assert.equal(r.codigo, 2);
  assert.match(r.out, /só pode apontar para o Groq ou para o próprio computador/);
  assert.ok(!r.out.includes(CHAVE));
});

test('a transcrição do Groq tem o mesmo formato da que o SRT gera', async () => {
  const { lerSrt } = await import('../../pos-gravacao/scripts/srt-para-transcricao.mjs');
  const deSrt = gerarTranscricao(lerSrt('1\n00:00:01,900 --> 00:00:03,000\nOlá, pessoal.\n\n2\n00:00:04,900 --> 00:00:06,000\nBem-vindos.\n'));
  const c = curso();
  await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(200, segs('Olá, pessoal.', 'Bem-vindos.')) });
  assert.equal(readFileSync(c.transcricao, 'utf8'), deSrt);
});

// ---------- adendo do review (rodada 2) ----------

const LONGO = (antes) => 'x'.repeat(antes) + CHAVE + ' e mais texto depois';

test('1.1/4.2: chave que atravessa o caractere 200 da mensagem do serviço não vaza nem em pedaço', async () => {
  for (const antes of [150, 180, 185, 195, 199, 200]) {
    const t = par(() => resposta(400, { error: { message: LONGO(antes) } }));
    await assert.rejects(t.chamar(), (e) => !/gsk_|FICTICIA/.test(e.message), `antes=${antes}`);
  }
});

test('1.1/4.2: a saída do comando, com a chave perto do caractere 200 da resposta, não tem a chave nem pedaço dela', async () => {
  for (const antes of [170, 185, 195]) {
    const c = curso();
    const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(400, { error: { message: LONGO(antes) } }) });
    assert.equal(r.codigo, 6);
    assert.ok(!/gsk_|FICTICIA/.test(r.saida), r.saida);
  }
});

test('1.2: espaço e CR dentro das aspas saem da chave', () => {
  for (const linha of [`GROQ_API_KEY=" ${CHAVE} "`, `GROQ_API_KEY='\t${CHAVE}\r'`, `GROQ_API_KEY="${CHAVE}\r"`]) {
    assert.equal(lerEnv(curso({ env: `${linha}\n` }).raiz).GROQ_API_KEY, CHAVE, linha);
  }
});

test('1.2: com a chave entre aspas e espaços, o eco do serviço (sem os espaços) também é redigido', async () => {
  const c = curso({ env: `GROQ_API_KEY=" ${CHAVE} "\n` });
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(400, { error: { message: `Invalid ${CHAVE}` } }) });
  assert.ok(!r.saida.includes(CHAVE) && !/gsk_/.test(r.saida), r.saida);
});

test('3.1: a transcrição é gravada num temporário ao lado e só depois renomeada', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-atomico-'));
  const final = join(pasta, 'transcricao.md');
  let visto;
  gravarAtomico(final, 'texto inteiro', (de, para) => {
    visto = { finalExiste: existsSync(para), temporario: readFileSync(de, 'utf8'), mesmaPasta: dirname(de) === pasta };
    renameSync(de, para);
  });
  assert.deepEqual(visto, { finalExiste: false, temporario: 'texto inteiro', mesmaPasta: true });
  assert.equal(readFileSync(final, 'utf8'), 'texto inteiro');
  assert.deepEqual(readdirSync(pasta), ['transcricao.md']);
});

test('3.1: falha no meio da gravação não deixa o arquivo final nem temporário', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-atomico-'));
  const final = join(pasta, 'transcricao.md');
  assert.throws(() => gravarAtomico(final, 'texto', () => { throw new Error('disco cheio'); }), /disco cheio/);
  assert.deepEqual(readdirSync(pasta), []);
});

test('3.1: se a transcrição apareceu enquanto o envio rodava, não sobrescreve', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-atomico-'));
  const final = join(pasta, 'transcricao.md');
  writeFileSync(final, 'de outra rodada');
  assert.throws(() => gravarAtomico(final, 'novo'), (e) => e.codigo === 3);
  assert.equal(readFileSync(final, 'utf8'), 'de outra rodada');
  assert.deepEqual(readdirSync(pasta), ['transcricao.md']);
});

test('3.1: outra rodada que grava a transcrição entre a conferência e a publicação não é sobrescrita', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-atomico-'));
  const final = join(pasta, 'transcricao.md');
  assert.throws(() => gravarAtomico(final, 'novo', (de, para) => {
    writeFileSync(para, 'de outra rodada');
    linkSync(de, para);
  }), (e) => e.codigo === 3);
  assert.equal(readFileSync(final, 'utf8'), 'de outra rodada');
  assert.deepEqual(readdirSync(pasta), ['transcricao.md']);
});

test('3.2: WAV sem nenhum dado de áudio é recusado com mensagem clara, sem enviar nada', async () => {
  const c = curso({ segundos: 0 });
  for (const args of [[], ['--transcrever']]) {
    const r = await rodar(c, args, { fetchImpl: () => assert.fail('não pode chamar') });
    assert.equal(r.codigo, 2);
    assert.match(r.saida, /não tem áudio/);
    assert.ok(!/Infinity|NaN/.test(r.saida));
  }
  assert.equal(existsSync(c.transcricao), false);
});

test('2.2: gravação grande avisa, junto do custo, que falha no meio cobra de novo as partes já enviadas', async () => {
  const grande = curso({ segundos: 5 });
  const saida = [];
  const codigo = await transcrever([grande.aula], { cwd: grande.raiz, env: { AULA_PRONTA_LIMITE_BYTES: '1000' }, log: (t) => saida.push(t), fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(codigo, 0);
  assert.match(saida.join('\n'), /Custo estimado.*[\s\S]*várias partes[\s\S]*cobra de novo/);
  assert.match(saida.join('\n'), /cada parte paga o mínimo de 10 s, então o valor real pode ser um pouco maior/);
});

test('2.2: gravação pequena não leva o aviso de partes', async () => {
  const c = curso();
  const r = await rodar(c, [], { fetchImpl: () => assert.fail('não pode chamar') });
  assert.ok(!/cobra de novo/.test(r.saida));
  assert.ok(!/cada parte paga o mínimo de 10 s, então o valor real pode ser um pouco maior/.test(r.saida));
});

test('2.2: com mais de uma parte, o aviso sai de novo antes do primeiro envio', SEM_FFMPEG, async () => {
  const c = curso({ segundos: 40, ruido: true });
  const eventos = [];
  await transcrever([c.aula, '--transcrever'], {
    cwd: c.raiz,
    env: { AULA_PRONTA_LIMITE_BYTES: '300000' },
    esperar: async () => {},
    log: (t) => eventos.push(`log:${t}`),
    fetchImpl: async () => (eventos.push('fetch'), resposta(200, segs('ok'))),
  });
  const aviso = eventos.findIndex((e) => /Vou enviar \d+ partes.*cobra de novo/.test(e));
  assert.ok(aviso >= 0 && aviso < eventos.indexOf('fetch'), JSON.stringify(eventos));
});

// ---------- rodada 3 (review Sonnet) ----------

test('r3-1: chave com aspas curvas ou acento é recusada antes de qualquer envio, sem repetir', async () => {
  for (const ruim of ['“gsk_abc123”', 'gsk_çhave']) {
    const c = curso({ env: `GROQ_API_KEY=${ruim}\n` });
    for (const args of [[], ['--transcrever']]) {
      const r = await rodar(c, args, { fetchImpl: () => assert.fail('não pode chamar') });
      assert.equal(r.codigo, 3, ruim);
      assert.match(r.saida, /caractere estranho \(aspas curvas\?\).*\.env/);
      assert.ok(!r.saida.includes(ruim.slice(0, 6)), r.saida);
    }
  }
});

test('r3-1: enviarParte também recusa chave estranha sem chamar o serviço', async () => {
  const t = par(() => resposta(200, segs('ok')), { chave: '“gsk_x”' });
  await assert.rejects(t.chamar(), (e) => /caractere estranho/.test(e.message));
  assert.equal(t.chamadas.length, 0);
});

test('r3-1: só falha de rede de verdade é repetida; erro de programação sobe na hora', async () => {
  const bug = par(() => { throw new TypeError('Headers.append: valor inválido'); });
  await assert.rejects(bug.chamar(), TypeError);
  assert.equal(bug.chamadas.length, 1);
  for (const erro of [
    Object.assign(new Error('x'), { name: 'AbortError' }),
    Object.assign(new Error('x'), { name: 'TimeoutError' }),
    Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }),
  ]) {
    const t = par(() => { throw erro; });
    await assert.rejects(t.chamar(), /depois de 4 tentativas/);
    assert.equal(t.chamadas.length, TENTATIVAS, erro.name);
  }
});

test('r3-2: a limpeza apaga a pasta temporária e o temporário da transcrição', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'ap-limpa-'));
  const temporaria = join(pasta, 'cortes');
  mkdirSync(temporaria);
  writeFileSync(join(temporaria, 'completo.flac'), 'cópia da gravação');
  const saida = join(pasta, 'transcricao.md');
  writeFileSync(modulo.nomeDoTemporario(saida), 'meio');
  modulo.limparTemporarios({ temporaria, saida });
  assert.deepEqual(readdirSync(pasta), []);
  modulo.limparTemporarios({ temporaria, saida }); // chamar de novo não quebra
});

test('r3-2: SIGINT no meio do envio limpa o temporário, sai com 130 e solta os ouvintes', async () => {
  const c = curso();
  const antes = { int: process.listenerCount('SIGINT'), term: process.listenerCount('SIGTERM') };
  const temporarios = () => readdirSync(tmpdir()).filter((n) => n.startsWith('aula-pronta-')).length;
  const base = temporarios();
  const saidas = [];
  let visto;
  const codigo = await transcrever([c.aula, '--transcrever'], {
    cwd: c.raiz,
    env: {},
    esperar: async () => {},
    log: () => {},
    sair: (cod) => saidas.push(cod),
    fetchImpl: async () => {
      visto = { int: process.listenerCount('SIGINT'), antes: temporarios() };
      writeFileSync(modulo.nomeDoTemporario(c.transcricao), 'meio');
      process.emit('SIGINT');
      visto.depois = temporarios();
      visto.tmpDaTranscricao = existsSync(modulo.nomeDoTemporario(c.transcricao));
      return resposta(200, segs('ok'));
    },
  });
  assert.equal(codigo, 0);
  assert.deepEqual(saidas, [130]);
  assert.equal(visto.int, antes.int + 1, 'ouvinte de SIGINT registrado durante o envio');
  assert.equal(visto.antes, base + 1);
  assert.equal(visto.depois, base, 'pasta temporária apagada pelo sinal');
  assert.equal(visto.tmpDaTranscricao, false);
  assert.deepEqual({ int: process.listenerCount('SIGINT'), term: process.listenerCount('SIGTERM') }, antes);
});

test('r3-3: sobra menor que 1 s junta na parte anterior', () => {
  const p = planejarPartes(1000.04, 1_000_040, 555_556);
  assert.equal(p.length, 2);
  assert.equal(p[0].duracao, 500);
  assert.ok(Math.abs(p[1].duracao - 500.04) < 1e-6);
  assert.equal(p[1].inicio + p[1].duracao, 1000.04);
  assert.ok(planejarPartes(1000.9, 1_000_900, 555_556).length === 2);
  assert.equal(planejarPartes(1001.5, 1_001_500, 555_556).length, 3, 'sobra de 1,5 s fica como parte');
});

test('r3-4: o tempo máximo cresce com o tamanho da parte', () => {
  assert.equal(modulo.tempoLimite(0), 60_000);
  assert.ok(modulo.tempoLimite(24_000_000) > modulo.tempoLimite(1_000_000));
  assert.ok(modulo.tempoLimite(24_000_000) >= 60_000 + 24_000_000 / 15);
  });

test('r3-4: enviarParte usa o tempo máximo pelo tamanho quando não recebe um', async () => {
  const usados = [];
  const orig = AbortSignal.timeout;
  AbortSignal.timeout = (ms) => (usados.push(ms), orig.call(AbortSignal, ms));
  try {
    await par(() => resposta(200, segs('ok'))).chamar();
    await par(() => resposta(200, segs('ok')), { dados: Buffer.alloc(15_000_000) }).chamar();
  } finally {
    AbortSignal.timeout = orig;
  }
  assert.equal(usados[0], modulo.tempoLimite(1));
  assert.equal(usados[1], modulo.tempoLimite(15_000_000));
});

test('r3-4: corpo ilegível na resposta tem mensagem própria e não repete o envio', async () => {
  const quebrado = { ok: true, status: 200, headers: new Headers(), json: async () => { throw new SyntaxError('Unexpected end of JSON input'); } };
  const t = par(() => quebrado);
  await assert.rejects(t.chamar(), (e) => /ler a resposta do Groq/.test(e.message) && !/marcas de tempo/.test(e.message) && e.codigo === 6);
  assert.equal(t.chamadas.length, 1);
  const semMarcas = par(() => resposta(200, { text: 'oi' }));
  await assert.rejects(semMarcas.chamar(), /sem as marcas de tempo/);
});

test('r3-7: gravacao.* por link simbólico para fora de aulas/ é recusada', async (t) => {
  const c = curso({ segundos: 3 });
  const fora = join(mkdtempSync(join(tmpdir(), 'ap-fora-')), 'gravacao.wav');
  writeFileSync(fora, wav(3));
  unlinkSync(join(c.aula, 'gravacao.wav'));
  try {
    symlinkSync(fora, join(c.aula, 'gravacao.wav'));
  } catch (e) {
    if (e.code === 'EPERM') return t.skip('sem permissão para link simbólico (EPERM)');
    throw e;
  }
  const r = await rodar(c, [], { fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(r.codigo, 2);
  assert.match(r.saida, /fora da pasta aulas\//);
});

test('r3-7: arquivo passado direto só vale se for áudio ou vídeo', async () => {
  const c = curso();
  for (const nome of ['notas.txt', '.env', 'material.md']) {
    writeFileSync(join(c.aula, nome), 'x');
    const saida = [];
    const codigo = await transcrever([join(c.aula, nome)], { cwd: c.raiz, env: {}, log: (t) => saida.push(t), fetchImpl: () => assert.fail('não pode chamar') });
    assert.equal(codigo, 2, nome);
    assert.match(saida.join(''), /não é áudio nem vídeo/);
  }
  const certo = await transcrever([join(c.aula, 'gravacao.wav')], { cwd: c.raiz, env: {}, log: () => {}, fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(certo, 0);
});

test('r3-8: letra do disco em caixa diferente não recusa aula válida (Windows)', { skip: process.platform !== 'win32' && 'só no Windows' }, async () => {
  const c = curso();
  const minuscula = c.raiz[0].toLowerCase() + c.raiz.slice(1);
  const maiuscula = c.raiz[0].toUpperCase() + c.raiz.slice(1);
  const saida = [];
  const codigo = await transcrever([join(maiuscula, 'aulas', '01-aula-teste'), '--curso', minuscula], { cwd: c.raiz, env: {}, log: (t) => saida.push(t), fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(codigo, 0, saida.join('\n'));
});

test('r3-8: pasta de fora com nome parecido continua recusada', async () => {
  const c = curso();
  const parecida = join(c.raiz, 'aulas-extra');
  mkdirSync(parecida);
  writeFileSync(join(parecida, 'gravacao.wav'), wav(2));
  const codigo = await transcrever([parecida], { cwd: c.raiz, env: {}, log: () => {}, fetchImpl: () => assert.fail('não pode chamar') });
  assert.equal(codigo, 2);
});

test('r3-9: 403 fala em chave ou permissão da conta; 401 continua só chave', async () => {
  const t403 = par(() => resposta(403, 'proibido'));
  await assert.rejects(t403.chamar(), /chave ou a permissão da conta \(403\)/);
  const t401 = par(() => resposta(401, 'não'));
  await assert.rejects(t401.chamar(), (e) => /recusou a chave \(401\)/.test(e.message) && !/permissão/.test(e.message));
});

test('r3-9: trecho com tempo inválido é descartado e a saída diz quantos', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], {
    fetchImpl: () => resposta(200, { segments: [{ start: 1, end: 2, text: 'bom' }, { start: 'x', end: 3, text: 'sem tempo' }, { start: null, end: null, text: 'outro' }] }),
  });
  assert.equal(r.codigo, 0, r.saida);
  assert.match(r.saida, /2 trechos? sem marca de tempo válida foram descartados/);
  assert.doesNotMatch(readFileSync(c.transcricao, 'utf8'), /sem tempo/);
});

test('r3-9: sem trecho descartado, nada de aviso', async () => {
  const c = curso();
  const r = await rodar(c, ['--transcrever'], { fetchImpl: () => resposta(200, segs('ok')) });
  assert.doesNotMatch(r.saida, /descartados/);
});
