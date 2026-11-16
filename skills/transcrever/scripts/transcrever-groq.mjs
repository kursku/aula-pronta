#!/usr/bin/env node
// Transcreve a gravação de uma aula (áudio ou vídeo) pelo Groq Whisper e grava a transcrição no formato comum
// do aula-pronta (o mesmo do SRT: ver docs/referencia-dos-comandos.md, "Formato da transcrição").
// Uso: node transcrever-groq.mjs <pasta-da-aula | arquivo-de-audio> [--transcrever] [--curso <pasta>] [--modelo <id>]
// Sem --transcrever só confere a chave e estima o custo: nenhuma chamada ao Groq, nada é gravado.
// Sem dependências além do ffmpeg/ffprobe (só quando o arquivo passa do limite ou não é WAV).
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, linkSync, readSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarTranscricao } from '../../pos-gravacao/scripts/srt-para-transcricao.mjs';

// Conferido na documentação oficial do Groq (console.groq.com/docs/speech-to-text) em 13/11/2026.
export const PRECO_CONFERIDO_EM = '13/11/2026';
export const PRECO_POR_HORA = { 'whisper-large-v3-turbo': 0.04, 'whisper-large-v3': 0.111 }; // US$
export const MODELO_PADRAO = 'whisper-large-v3-turbo';
export const MINIMO_COBRADO_S = 10; // "se enviar menos, ainda cobra 10 segundos"
// Limite de arquivo do Groq: 25 MB (plano grátis) e 100 MB (dev). Usa o do grátis, com folga, para valer nos dois.
export const LIMITE_BYTES = 24_000_000;
export const TENTATIVAS = 4; // a 1ª chamada e até 3 repetições
const URL_PADRAO = 'https://api.groq.com/openai/v1/audio/transcriptions';
const EXTENSOES = ['mp3', 'mp4', 'm4a', 'wav', 'flac', 'ogg', 'webm', 'mpeg', 'mpga'];

export class ErroDoComando extends Error {
  constructor(mensagem, codigo) {
    super(mensagem);
    this.codigo = codigo;
  }
}

// ---------- chave ----------

// Lê só pares CHAVE=valor do .env da pasta do curso. Nunca devolve nada ao terminal: quem chama só confere se existe.
export function lerEnv(curso) {
  let texto;
  try {
    texto = readFileSync(join(curso, '.env'), 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'EISDIR') return {};
    throw e;
  }
  const valores = {};
  for (const linha of texto.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = linha.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/);
    if (!m) continue;
    const bruto = m[2].trim();
    const aspas = bruto.match(/^(["'])([\s\S]*?)\1/);
    valores[m[1]] = aspas ? aspas[2].trim() : bruto.split(/\s/)[0];
  }
  return valores;
}

// Chave do Groq é ASCII visível. Aspas curvas ou acento (colados de um editor de texto) quebram o cabeçalho.
export function validarChave(chave) {
  if (!/^[\x21-\x7e]+$/.test(chave)) throw new ErroDoComando('A chave tem caractere estranho (aspas curvas?), confira o .env. Não enviei nada.', 3);
}

export const redigir = (texto, chave) => (chave ? String(texto).split(chave).join('[chave]') : String(texto));

const MSG_SEM_CHAVE = [
  'Não achei a chave do Groq, então não transcrevi nada e não criei nenhum arquivo.',
  'Para configurar:',
  '1. Crie uma chave em https://console.groq.com/keys (é a sua conta; o aula-pronta nunca a mostra).',
  '2. Na pasta do curso, crie o arquivo .env com uma linha só: GROQ_API_KEY=cole-a-chave-aqui',
  '3. Rode o comando de novo. O .env já fica fora do Git (o iniciar cuida disso).',
  'Se você já tem o SRT da aula (CapCut, YouTube ou a plataforma), use o /aula-pronta:pos-gravacao: ele não precisa de chave.',
].join('\n');

// A URL só pode ser a do Groq ou a de um servidor local (testes): a chave nunca vai para outro lugar.
export function urlDoServico(valor) {
  if (!valor) return URL_PADRAO;
  let u;
  try {
    u = new URL(valor);
  } catch {
    throw new ErroDoComando('AULA_PRONTA_GROQ_URL não é uma URL válida.', 2);
  }
  const local = u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname);
  if (!(local || valor === URL_PADRAO)) {
    throw new ErroDoComando('AULA_PRONTA_GROQ_URL só pode apontar para o Groq ou para o próprio computador. Não enviei nada.', 2);
  }
  return valor;
}

// ---------- duração e custo ----------

// Duração de um WAV pelo cabeçalho, sem ffprobe. null se não for um WAV que se entenda.
export function duracaoWav(arquivo) {
  const fd = openSync(arquivo, 'r');
  try {
    const b = Buffer.alloc(4096);
    const n = readSync(fd, b, 0, b.length, 0);
    if (n < 44 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WAVE') return null;
    let pos = 12;
    let bytesPorSegundo = 0;
    while (pos + 8 <= n) {
      const id = b.toString('latin1', pos, pos + 4);
      const tam = b.readUInt32LE(pos + 4);
      if (id === 'fmt ') bytesPorSegundo = b.readUInt32LE(pos + 16);
      if (id === 'data') {
        const restante = statSync(arquivo).size - (pos + 8);
        const dados = tam === 0 || tam === 0xffffffff || tam > restante ? restante : tam;
        return bytesPorSegundo > 0 ? dados / bytesPorSegundo : null;
      }
      pos += 8 + tam + (tam % 2);
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

const binario = (env, nome) => env[`AULA_PRONTA_${nome.toUpperCase()}`] ?? nome;

const FALTA_FFMPEG = new ErroDoComando(
  'Falta o ffmpeg, o programa que mede e corta o áudio. Instale e rode de novo: no Windows, `winget install ffmpeg`; no Mac, `brew install ffmpeg`. Não instalei nada.',
  5,
);

function executarFerramenta(executar, programa, argumentos) {
  const r = executar(programa, argumentos, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error?.code === 'ENOENT') throw FALTA_FFMPEG;
  if (r.error) throw new ErroDoComando(`Não consegui rodar o ${basename(programa)}: ${r.error.message}`, 5);
  return r;
}

export function medirDuracao(arquivo, { env = process.env, executar = spawnSync } = {}) {
  const wav = /\.wav$/i.test(arquivo) ? duracaoWav(arquivo) : null;
  if (wav === 0) throw new ErroDoComando(`${basename(arquivo)} não tem áudio: a gravação está vazia.`, 2);
  if (wav !== null) return wav;
  const r = executarFerramenta(executar, binario(env, 'ffprobe'), [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arquivo,
  ]);
  const segundos = Number.parseFloat(r.stdout);
  if (r.status !== 0 || !Number.isFinite(segundos) || segundos <= 0) {
    throw new ErroDoComando(`Não consegui medir a duração de ${basename(arquivo)}. O arquivo tem áudio?`, 2);
  }
  return segundos;
}

export function estimarCusto(segundos, modelo = MODELO_PADRAO) {
  const porHora = PRECO_POR_HORA[modelo];
  if (porHora === undefined) throw new ErroDoComando(`Modelo desconhecido: ${modelo}. Use ${Object.keys(PRECO_POR_HORA).join(' ou ')}.`, 2);
  const cobrados = Math.max(segundos, MINIMO_COBRADO_S);
  return { dolares: (cobrados / 3600) * porHora, cobrados, porHora };
}

const dinheiro = (d) => `US$ ${(d < 0.01 ? d.toFixed(4) : d.toFixed(2)).replace('.', ',')}`;
const minutos = (s) => (s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);

export function textoDoCusto(segundos, modelo) {
  const { dolares, porHora } = estimarCusto(segundos, modelo);
  return (
    `Custo estimado: ${dinheiro(dolares)} (${minutos(segundos)} de áudio no modelo ${modelo}, a US$ ${String(porHora).replace('.', ',')} por hora de áudio; ` +
    `o Groq cobra no mínimo ${MINIMO_COBRADO_S} s por envio). Preço conferido na documentação do Groq em ${PRECO_CONFERIDO_EM}: ` +
    'pode ter mudado e é cobrado na sua conta do Groq, não pelo aula-pronta.'
  );
}

// ---------- cortes ----------

// shortcut: sem cache das partes já transcritas; uma falha no meio refaz (e cobra) tudo na próxima rodada. Guardar o parcial se isso doer.
export const AVISO_PARTES_TALVEZ =
  'Atenção: esta gravação passa do limite de tamanho do Groq e provavelmente será enviada em várias partes. ' +
  `Se o arquivo for cortado em partes, cada parte paga o mínimo de ${MINIMO_COBRADO_S} s, então o valor real pode ser um pouco maior. ` +
  'Se uma parte falhar no meio, o Groq já cobrou as partes enviadas e cobra de novo por elas se você rodar outra vez (o aula-pronta não guarda o que já foi transcrito).';
export const avisoDePartes = (n) =>
  `Vou enviar ${n} partes. Se uma falhar no meio, o Groq já cobrou as partes enviadas e cobra de novo por elas se você rodar outra vez (o aula-pronta não guarda o que já foi transcrito).`;

// Partes de no máximo `limite` bytes, em tempo (a taxa de bytes por segundo vem do arquivo já convertido).
export function planejarPartes(duracao, bytes, limite = LIMITE_BYTES) {
  if (bytes <= limite) return [{ inicio: 0, duracao }];
  const porParte = Math.max(1, Math.floor((limite * 0.9) / (bytes / duracao)));
  const partes = [];
  for (let inicio = 0; inicio < duracao; inicio += porParte) partes.push({ inicio, duracao: Math.min(porParte, duracao - inicio) });
  // Sobra de menos de 1 s: o Groq cobraria 10 s por ela e a emenda cortaria uma palavra. Junta na parte anterior.
  if (partes.length > 1 && partes.at(-1).duracao < 1) partes.at(-2).duracao += partes.pop().duracao;
  return partes;
}

// Converte para FLAC 16 kHz mono (o que o Groq recomenda) e corta em partes que cabem no limite.
// shortcut: o corte é seco, sem sobreposição; uma palavra exatamente na emenda pode sair partida. Melhorar se isso aparecer.
function prepararPartes(arquivo, duracao, pasta, { limite, env, executar }) {
  const ffmpeg = binario(env, 'ffmpeg');
  const completo = join(pasta, 'completo.flac');
  const base = ['-y', '-v', 'error'];
  const converter = (extra, entrada, saida) =>
    executarFerramenta(executar, ffmpeg, [...base, ...extra, '-i', entrada, '-vn', '-ar', '16000', '-ac', '1', '-map', '0:a:0', '-c:a', 'flac', saida]);
  const r = converter([], arquivo, completo);
  if (r.status !== 0 || !existsSync(completo)) throw new ErroDoComando(`O ffmpeg não conseguiu ler o áudio: ${(r.stderr || '').trim().slice(0, 200)}`, 5);

  let fator = 1;
  for (let rodada = 0; rodada < 4; rodada++) {
    const plano = planejarPartes(duracao, statSync(completo).size, Math.floor(limite * fator));
    if (plano.length === 1) return [{ arquivo: completo, inicio: 0 }];
    const partes = plano.map((p, i) => {
      const saida = join(pasta, `parte-${rodada}-${String(i + 1).padStart(3, '0')}.flac`);
      const c = converter(['-ss', String(p.inicio), '-t', String(p.duracao)], completo, saida);
      if (c.status !== 0) throw new ErroDoComando(`O ffmpeg falhou ao cortar a parte ${i + 1}: ${(c.stderr || '').trim().slice(0, 200)}`, 5);
      return { arquivo: saida, inicio: p.inicio };
    });
    if (partes.every((p) => statSync(p.arquivo).size <= limite)) return partes;
    fator *= 0.7; // FLAC varia com o conteúdo: alguma parte passou, refaz com partes menores
  }
  throw new ErroDoComando('Não consegui cortar o áudio em partes que caibam no limite do Groq.', 5);
}

// ---------- chamada ao Groq, com repetição ----------

const TEMPORARIOS = new Set([408, 429]);
const esperaPadrao = (ms) => new Promise((ok) => setTimeout(ok, ms));

function detalhe(corpo, chave) {
  let texto = String(corpo ?? '');
  try {
    texto = JSON.parse(texto)?.error?.message ?? texto;
  } catch {}
  // Redige antes de cortar: uma chave cortada no limite deixaria de casar e vazaria em pedaço.
  return redigir(String(texto), chave).replace(/\s+/g, ' ').trim().slice(0, 200);
}

// Pelo menos 60 s, mais o tempo de subir a parte a 15 KB/s (conexão lenta de casa).
export const tempoLimite = (bytes) => 60_000 + Math.ceil(bytes / 15);

export async function enviarParte({ dados, nome, chave, modelo, url, fetchImpl = fetch, esperar = esperaPadrao, baseMs = 1000, tentativas = TENTATIVAS, tempoMaximoMs = tempoLimite(dados.length) }) {
  validarChave(chave);
  let ultimo = 'sem resposta';
  for (let n = 1; n <= tentativas; n++) {
    let resposta;
    try {
      const form = new FormData();
      form.append('file', new Blob([dados]), nome);
      form.append('model', modelo);
      form.append('response_format', 'verbose_json');
      form.append('language', 'pt');
      form.append('temperature', '0');
      resposta = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${chave}` }, body: form, signal: AbortSignal.timeout(tempoMaximoMs) });
    } catch (e) {
      // Só falha de rede ou tempo esgotado é repetida; erro do próprio programa sobe, em vez de ser repetido 4 vezes.
      if (!(e.name === 'AbortError' || e.name === 'TimeoutError' || e.cause)) throw e;
      ultimo = `falha de rede (${redigir(e.cause?.code ?? e.name ?? 'erro', chave)})`;
      if (n < tentativas) await esperar(baseMs * 2 ** (n - 1));
      continue;
    }
    if (resposta.ok) {
      const json = await resposta.json().catch(() => undefined);
      if (json === undefined) {
        throw new ErroDoComando('Não consegui ler a resposta do Groq (corpo inválido ou interrompido). Não gravei nada. O Groq pode ter cobrado este envio: confira o uso na sua conta antes de rodar de novo.', 6);
      }
      if (!Array.isArray(json?.segments)) throw new ErroDoComando('O Groq respondeu sem as marcas de tempo. Não gravei nada.', 6);
      return json.segments;
    }
    const corpo = await resposta.text().catch(() => '');
    if (TEMPORARIOS.has(resposta.status) || resposta.status >= 500) {
      ultimo = `o Groq respondeu ${resposta.status}`;
      const pedido = Number(resposta.headers.get('retry-after'));
      if (n < tentativas) await esperar(Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 60) * 1000 : baseMs * 2 ** (n - 1));
      continue;
    }
    const d = detalhe(corpo, chave);
    if (resposta.status === 401 || resposta.status === 403) {
      const quem = resposta.status === 401 ? 'a chave' : 'a chave ou a permissão da conta';
      throw new ErroDoComando(`O Groq recusou ${quem} (${resposta.status}). Confira a GROQ_API_KEY no .env: ela precisa estar certa e ativa, e a conta precisa poder usar a transcrição. Não repeti nem gravei nada.`, 6);
    }
    if (resposta.status === 413) throw new ErroDoComando('O Groq disse que o arquivo é grande demais (413). Não gravei nada.', 6);
    throw new ErroDoComando(`O Groq recusou o envio (${resposta.status}): ${d}. Não repeti nem gravei nada.`, 6);
  }
  throw new ErroDoComando(`O Groq não respondeu depois de ${tentativas} tentativas (${ultimo}). Não gravei nada; tente de novo mais tarde.`, 6);
}

// Segmentos do Groq (segundos desde o começo da parte) -> trechos da transcrição, somando o início da parte.
// `descartado` é chamado para cada trecho com fala mas sem tempo válido (o Groq devolve números; texto ou null não serve).
export const paraTrechos = (segmentos, inicio, descartado = () => {}) =>
  segmentos.flatMap((s) => {
    const texto = String(s.text ?? '').replace(/\s+/g, ' ').trim();
    if (!texto) return [];
    if (!Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < 0 || s.end <= s.start) return (descartado(), []);
    return [{ inicio: inicio + s.start, fim: inicio + s.end, texto }];
  });

export const nomeDoTemporario = (saida) => join(dirname(saida), `.${basename(saida)}.${process.pid}.tmp`);

// Apaga o que este comando cria fora da pasta do curso (cortes de áudio) e o temporário da transcrição.
export function limparTemporarios({ temporaria, saida }) {
  if (temporaria) rmSync(temporaria, { recursive: true, force: true });
  if (saida) rmSync(nomeDoTemporario(saida), { force: true });
}

// Grava num temporário ao lado e publica no fim: um corte no meio da gravação nunca deixa a transcricao.md pela metade.
// linkSync falha com EEXIST se outra rodada criou a transcricao.md nesse meio-tempo: nunca sobrescreve.
export function gravarAtomico(saida, texto, publicar = linkSync) {
  const temporario = nomeDoTemporario(saida);
  const jaExiste = () => new ErroDoComando(`Já existe ${saida}. A transcrição não é sobrescrita.`, 3);
  try {
    writeFileSync(temporario, texto, { encoding: 'utf8', flag: 'wx' });
    if (existsSync(saida)) throw jaExiste();
    try {
      publicar(temporario, saida);
    } catch (e) {
      throw e.code === 'EEXIST' ? jaExiste() : e;
    }
  } finally {
    rmSync(temporario, { force: true });
  }
}

// ---------- comando ----------

// Compara por relative(): no Windows ele ignora a caixa da letra do disco (C:\ e c:\ são o mesmo lugar).
const dentroDe = (pai, filho) => {
  const r = relative(pai, filho);
  return r !== '' && r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r);
};

function acharAudio(entrada) {
  if (!existsSync(entrada)) throw new ErroDoComando(`Não encontrei ${entrada}.`, 2);
  if (!statSync(entrada).isDirectory()) {
    if (!EXTENSOES.includes(extname(entrada).slice(1).toLowerCase())) {
      throw new ErroDoComando(`${basename(entrada)} não é áudio nem vídeo que eu aceite (${EXTENSOES.join(', ')}).`, 2);
    }
    return { arquivo: entrada, pasta: dirname(entrada) };
  }
  for (const ext of EXTENSOES) {
    const arquivo = join(entrada, `gravacao.${ext}`);
    if (existsSync(arquivo)) return { arquivo, pasta: entrada };
  }
  throw new ErroDoComando(`Não achei a gravação em ${entrada}. Salve o áudio ou o vídeo da aula nela com o nome gravacao.mp4 (ou .mp3, .wav, .m4a, .flac, .ogg, .webm).`, 2);
}

function lerArgumentos(argv) {
  const uso = 'Uso: node transcrever-groq.mjs <pasta-da-aula> [--transcrever] [--curso <pasta>] [--modelo <id>]';
  const a = { transcrever: false, curso: null, modelo: MODELO_PADRAO, entrada: null };
  const exigirValor = (valor) => {
    if (!valor || valor.startsWith('--')) throw new ErroDoComando(uso, 2);
    return valor;
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--transcrever') a.transcrever = true;
    else if (argv[i] === '--curso') a.curso = exigirValor(argv[++i]);
    else if (argv[i] === '--modelo') a.modelo = exigirValor(argv[++i]);
    else if (!a.entrada && !argv[i].startsWith('--')) a.entrada = argv[i];
    else throw new ErroDoComando(`Argumento que não conheço: ${argv[i]}`, 2);
  }
  if (!a.entrada) throw new ErroDoComando(uso, 2);
  return a;
}

export async function transcrever(argv, { cwd = process.cwd(), env = process.env, fetchImpl = fetch, esperar = esperaPadrao, executarFerramenta: run = spawnSync, log = console.log, sair = (c) => process.exit(c) } = {}) {
  let chave = '';
  const dizer = (t) => log(redigir(t, chave));
  try {
    const a = lerArgumentos(argv);
    const curso = resolve(cwd, a.curso ?? '.');
    const { arquivo, pasta } = acharAudio(resolve(cwd, a.entrada));

    // Só dentro de aulas/ do curso: o comando não lê nem grava fora dela.
    const aulas = join(realpathSync(curso), 'aulas');
    if (!dentroDe(aulas, realpathSync(pasta))) throw new ErroDoComando('Só transcrevo aulas que estão dentro da pasta aulas/ do curso.', 2);
    if (!dentroDe(aulas, realpathSync(arquivo))) {
      throw new ErroDoComando('A gravação é um atalho para um arquivo fora da pasta aulas/. Copie o arquivo para a pasta da aula e rode de novo.', 2);
    }

    const saida = join(pasta, 'transcricao.md');
    if (existsSync(saida)) throw new ErroDoComando(`Já existe ${saida}. A transcrição não é sobrescrita: apague-a (se a aula foi regravada) e rode de novo.`, 3);

    const ambiente = lerEnv(curso);
    chave = ambiente.GROQ_API_KEY ?? '';
    if (!chave) throw new ErroDoComando(MSG_SEM_CHAVE, 3);
    validarChave(chave);
    const url = urlDoServico(env.AULA_PRONTA_GROQ_URL ?? ambiente.AULA_PRONTA_GROQ_URL);
    dizer('Chave do Groq encontrada no .env (o valor não é mostrado).');

    const duracao = medirDuracao(arquivo, { env, executar: run });
    const limite = Number(env.AULA_PRONTA_LIMITE_BYTES) || LIMITE_BYTES;
    dizer(textoDoCusto(duracao, a.modelo));
    if (statSync(arquivo).size > limite) dizer(AVISO_PARTES_TALVEZ);
    if (!a.transcrever) {
      dizer('Nada foi enviado ao Groq e nada foi gravado. Para transcrever, confirme o custo e rode de novo com --transcrever.');
      return 0;
    }

    const baseMs = env.AULA_PRONTA_ESPERA_MS === undefined ? 1000 : Number(env.AULA_PRONTA_ESPERA_MS);
    const temporaria = mkdtempSync(join(tmpdir(), 'aula-pronta-'));
    // Ctrl+C no meio do envio não pode deixar cópia da gravação no temporário do sistema.
    const aoInterromper = () => {
      limparTemporarios({ temporaria, saida });
      sair(130);
    };
    process.once('SIGINT', aoInterromper);
    process.once('SIGTERM', aoInterromper);
    try {
      const partes =
        statSync(arquivo).size <= limite
          ? [{ arquivo, inicio: 0 }]
          : (dizer('O arquivo passa do limite do Groq: vou cortá-lo em partes.'), prepararPartes(arquivo, duracao, temporaria, { limite, env, executar: run }));
      if (partes.length > 1) dizer(avisoDePartes(partes.length));
      const trechos = [];
      let descartados = 0;
      for (const [i, p] of partes.entries()) {
        if (partes.length > 1) dizer(`Enviando a parte ${i + 1} de ${partes.length}...`);
        const segmentos = await enviarParte({ dados: readFileSync(p.arquivo), nome: basename(p.arquivo), chave, modelo: a.modelo, url, fetchImpl, esperar, baseMs });
        trechos.push(...paraTrechos(segmentos, p.inicio, () => descartados++));
      }
      if (descartados) {
        dizer(descartados === 1 ? 'Atenção: 1 trecho sem marca de tempo válida foi descartado.' : `Atenção: ${descartados} trechos sem marca de tempo válida foram descartados.`);
      }
      if (!trechos.length) throw new ErroDoComando('O Groq não achou nenhuma fala nesse áudio. Não gravei nada.', 6);
      // Só aqui, com todas as partes prontas: nunca fica transcrição parcial.
      trechos.sort((a, b) => a.inicio - b.inicio); // a fala na emenda de duas partes pode chegar fora de ordem
      gravarAtomico(saida, gerarTranscricao(trechos));
      dizer(`Transcrição gravada em ${saida} (${trechos.length} trechos).`);
      return 0;
    } finally {
      process.off('SIGINT', aoInterromper);
      process.off('SIGTERM', aoInterromper);
      limparTemporarios({ temporaria });
    }
  } catch (e) {
    dizer(e instanceof ErroDoComando ? e.message : `Erro inesperado: ${e.message}`);
    return e instanceof ErroDoComando ? e.codigo : 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await transcrever(process.argv.slice(2));
}
