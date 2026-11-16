#!/usr/bin/env node
// Parte mecânica da ingestão da wiki do curso: achar aula nova, copiar a transcrição sem alterá-la,
// manter o registro e o índice e conferir os links. Quem lê as aulas e escreve as páginas é o Claude, na skill.
// Uso (rode na pasta do curso): node wiki.mjs <comando> [pastas das aulas] [--limite N] [--data AAAA-MM-DD] [--bloco N] [--substituir]
//   preparar            cria wiki/ (raw, aulas, conceitos), regras.md e registro.md que faltam; nunca sobrescreve
//   novas               lista as aulas a processar, em blocos (JSON)
//   copiar <aula>...    copia a transcrição da aula para wiki/raw/<aula>/transcricao.md, byte a byte
//   registrar <aula>... anota a aula no registro (só depois da página dela estar escrita)
//   limpar-conceitos <aula>... tira a aula de "Aulas onde aparece" nos conceitos (primeiro passo de reingerir)
//   indice              refaz wiki/indice.md a partir do cabeçalho das páginas e põe "Aulas onde aparece" em ordem numérica
//   conferir            confere o registro, as cópias e os links das páginas (JSON; sai com 1 se achar problema)
// Sem dependências.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Acima deste número de aulas novas, a ingestão roda em blocos deste tamanho (um bloco = ler as
// transcrições, escrever as páginas e registrar, antes de começar o próximo).
export const LIMITE_BLOCO = 5;

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CABECALHO_REGISTRO = [
  '# Registro da wiki',
  '',
  'Uma linha por aula já ingerida: a pasta da aula, o hash (sha256) da transcrição que entrou, a data e o bloco.',
  'O aula-pronta só processa a aula que não está aqui. Quem escreve este arquivo é o comando de ingestão: não edite à mão.',
  '',
  '| Aula | Transcrição (sha256) | Ingerida em | Bloco |',
  '|---|---|---|---|',
  '',
].join('\n');
// O nome da pasta pode ter espaço, mas não "|" (exigirAula recusa).
const LINHA_REGISTRO = /^\|\s*([^|]+?)\s*\|\s*([0-9a-f]{64})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d+)\s*\|\s*$/;

// Campo do cabeçalho da página de aula com o hash da transcrição de que ela saiu: o registro só atesta página em dia.
export const CAMPO_HASH = 'transcricao-sha256';

export const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const ler = (caminho) => readFileSync(caminho, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const ehPasta = (caminho) => existsSync(caminho) && statSync(caminho).isDirectory();

// "02.1-montando" -> "2.1"; "10-x" -> "10"; sem prefixo numérico -> null. Mesma regra das outras skills.
export function numeroDaPasta(nome) {
  const m = nome.match(/^(\d+(?:\.\d+)*)-/);
  if (!m) return null;
  const partes = m[1].split('.').map((p) => String(Number(p)));
  return partes.some((p) => p === '0') && partes.length === 1 ? null : partes.join('.');
}

export function compararNumeros(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

const compararPastas = (a, b) => compararNumeros(numeroDaPasta(a), numeroDaPasta(b)) || a.localeCompare(b);

function exigirCurso(raiz) {
  if (!ehPasta(join(raiz, 'aulas'))) throw new Error('Esta não parece ser a pasta de um curso: falta a pasta aulas/. Rode /aula-pronta:iniciar antes.');
}

// Aula só vale com número no prefixo da pasta. Nome com barra, ponto no começo ou sem número é recusado.
function exigirNomeDeAula(pasta) {
  if (!pasta || /[\\/|]/.test(pasta) || pasta.startsWith('.') || numeroDaPasta(pasta) === null) {
    throw new Error(`"${pasta}" não é uma pasta de aula: o nome precisa começar com o número da aula (como 03-luz-extra).`);
  }
}

function exigirAula(raiz, pasta) {
  exigirNomeDeAula(pasta);
  if (!ehPasta(join(raiz, 'aulas', pasta))) throw new Error(`Não existe a pasta aulas/${pasta}.`);
}

export function lerRegistro(raiz) {
  const arquivo = join(raiz, 'wiki', 'registro.md');
  const linhas = new Map();
  if (!existsSync(arquivo)) return linhas;
  for (const linha of ler(arquivo).split('\n')) {
    const m = linha.match(LINHA_REGISTRO);
    if (m && !linhas.has(m[1])) linhas.set(m[1], { sha: m[2], data: m[3], bloco: Number(m[4]) });
  }
  return linhas;
}

// Linhas de tabela do registro que não são o cabeçalho nem o separador e não têm o formato de uma aula (hash que não
// tem 64 caracteres minúsculos, data que não é AAAA-MM-DD, bloco que não é número) ou que repetem uma aula já listada
// acima. lerRegistro as ignora: sem este aviso a aula voltaria como nova em silêncio, e o registrar apagaria a linha.
export function linhasMalformadas(raiz) {
  const arquivo = join(raiz, 'wiki', 'registro.md');
  if (!existsSync(arquivo)) return [];
  const vistas = new Set();
  const ruins = [];
  ler(arquivo).split('\n').forEach((bruta, i) => {
    const texto = bruta.trim();
    if (!texto.startsWith('|') || /^\|\s*Aula\s*\|/i.test(texto) || /^\|[\s:|-]+\|$/.test(texto)) return;
    const m = texto.match(LINHA_REGISTRO);
    if (m && !vistas.has(m[1])) vistas.add(m[1]);
    else ruins.push({ numero: i + 1, texto, motivo: m ? 'a aula já tem uma linha acima' : 'formato inválido' });
  });
  return ruins;
}

// Reescreve só as linhas das aulas: o texto fora da tabela (cabeçalho, notas) fica como está. Sem arquivo, usa o cabeçalho padrão.
function escreverRegistro(raiz, linhas) {
  const corpo = [...linhas].map(([pasta, r]) => `| ${pasta} | ${r.sha} | ${r.data} | ${r.bloco} |`);
  const arquivo = join(raiz, 'wiki', 'registro.md');
  if (!existsSync(arquivo)) {
    writeFileSync(arquivo, `${CABECALHO_REGISTRO}${corpo.join('\n')}${corpo.length ? '\n' : ''}`);
    return;
  }
  const fora = [];
  let ponto = -1;
  for (const linha of ler(arquivo).split('\n')) {
    if (LINHA_REGISTRO.test(linha)) { if (ponto < 0) ponto = fora.length; } else fora.push(linha);
  }
  if (ponto < 0) {
    const separador = fora.findIndex((l) => /^\|[\s:|-]+\|$/.test(l.trim()));
    ponto = separador < 0 ? fora.length : separador + 1;
  }
  fora.splice(ponto, 0, ...corpo);
  writeFileSync(arquivo, `${fora.join('\n').replace(/\n*$/, '')}\n`);
}

// 'protegido' | 'desprotegido' | 'sem-git' | 'desconhecido'. A cópia em wiki/raw guarda a fala inteira, inclusive
// dado sensível; o nome transcricao.md já é ignorado pelo iniciar, então basta conferir que o Git o ignora.
// Só "not a git repository" é sem-git. Qualquer outro erro do Git (dubious ownership, comum em /mnt/c no WSL,
// permissão, repositório corrompido) é desconhecido: a proteção não foi conferida e a skill para e pergunta.
const rodarGit = (raiz) => (args) => spawnSync('git', ['-C', raiz, ...args], { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C', LANGUAGE: 'C' } });

// `caminho` é o destino conferido. O padrão é um caminho de exemplo (serve ao novas); o copiar confere o destino
// real de cada aula, porque uma exceção "!wiki/raw/<aula>/transcricao.md" no .gitignore desprotege só aquela aula.
export function situacaoGitignore(raiz, git = rodarGit(raiz), caminho = 'wiki/raw/modelo/transcricao.md') {
  const dentro = git(['rev-parse', '--is-inside-work-tree']);
  if (dentro.error) return 'desconhecido';
  if (dentro.status !== 0) return /not a git repository/i.test(dentro.stderr ?? '') ? 'sem-git' : 'desconhecido';
  const r = git(['check-ignore', '-q', '--no-index', '--', caminho]);
  if (r.error) return 'desconhecido';
  if (r.status === 0) return 'protegido';
  return r.status === 1 ? 'desprotegido' : 'desconhecido';
}

export function preparar(raiz) {
  exigirCurso(raiz);
  const criados = [];
  for (const sub of ['wiki/raw', 'wiki/aulas', 'wiki/conceitos']) {
    if (!ehPasta(join(raiz, sub))) {
      mkdirSync(join(raiz, sub), { recursive: true });
      criados.push(`${sub}/`);
    }
  }
  const regras = join(raiz, 'wiki', 'regras.md');
  if (!existsSync(regras)) {
    copyFileSync(join(SKILL, 'regras-da-wiki.md'), regras);
    criados.push('wiki/regras.md');
  }
  if (!existsSync(join(raiz, 'wiki', 'registro.md'))) {
    escreverRegistro(raiz, new Map());
    criados.push('wiki/registro.md');
  }
  return { criados };
}

export function novas(raiz, limite = LIMITE_BLOCO) {
  exigirCurso(raiz);
  const registro = lerRegistro(raiz);
  const pastas = readdirSync(join(raiz, 'aulas'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const semNumero = pastas.filter((p) => numeroDaPasta(p) === null).sort();
  const aulas = pastas.filter((p) => numeroDaPasta(p) !== null).sort(compararPastas);
  const lista = { novas: [], alteradas: [], semTranscricao: [], transcricaoSumiu: [] };
  for (const pasta of aulas) {
    const transcricao = join(raiz, 'aulas', pasta, 'transcricao.md');
    if (!existsSync(transcricao)) {
      // Aula que já está no registro e perdeu a transcrição não é "sem transcrição": ela sumiu (pos-gravacao não resolve).
      (registro.has(pasta) ? lista.transcricaoSumiu : lista.semTranscricao).push(pasta);
      continue;
    }
    const registrada = registro.get(pasta);
    if (!registrada) lista.novas.push(pasta);
    else if (registrada.sha !== sha256(readFileSync(transcricao))) lista.alteradas.push(pasta);
  }
  // Aula nova que já tem página: a rodada anterior caiu antes do registro. Ela entra de novo em "novas".
  const interrompidas = lista.novas.filter((p) => existsSync(join(raiz, 'wiki', 'aulas', `${p}.md`)));
  // Aula do registro cuja pasta sumiu de aulas/ (renomeada ou apagada): a wiki a mantém até o infoprodutor decidir.
  const removidas = [...registro.keys()].filter((p) => !pastas.includes(p)).sort();
  // Página de aula sem registro e sem pasta em aulas/ (aula renomeada no meio da ingestão): não há o que reingerir.
  const orfas = arquivosMd(raiz, 'aulas').filter(ehPaginaDeAula).map((f) => f.slice(0, -3)).filter((p) => !registro.has(p) && !pastas.includes(p));
  const blocos = [];
  if (lista.novas.length > limite) for (let i = 0; i < lista.novas.length; i += limite) blocos.push(lista.novas.slice(i, i + limite));
  else if (lista.novas.length) blocos.push(lista.novas);
  return {
    limite,
    emBlocos: lista.novas.length > limite,
    jaRegistradas: [...registro.keys()].sort(compararPastas),
    ...lista,
    interrompidas,
    removidas,
    orfas,
    semNumero,
    blocos,
    avisos: linhasMalformadas(raiz).map(({ numero, texto, motivo }) => `wiki/registro.md, linha ${numero}: não entendi "${texto}" (${motivo}); a aula dela pode aparecer como nova. Pergunte ao infoprodutor antes de processá-la`),
    gitignore: situacaoGitignore(raiz),
  };
}

// Cópia byte a byte (copyFileSync, sem passar por texto), conferida pelo hash. Recusa trocar uma cópia diferente.
export function copiar(raiz, pasta, { substituir = false } = {}) {
  exigirCurso(raiz);
  exigirAula(raiz, pasta);
  const origem = join(raiz, 'aulas', pasta, 'transcricao.md');
  if (!existsSync(origem)) {
    if (lerRegistro(raiz).has(pasta)) throw new Error(`A transcrição da aula ${pasta} sumiu: a aula está no registro, mas aulas/${pasta}/transcricao.md não existe mais (a cópia em wiki/raw continua guardada). Pergunte ao infoprodutor se ela foi apagada por engano ou se a aula vai ser regravada, e não mexa na aula até ele responder.`);
    throw new Error(`A aula ${pasta} não tem transcricao.md. Rode /aula-pronta:pos-gravacao nela primeiro.`);
  }
  if (situacaoGitignore(raiz, undefined, `wiki/raw/${pasta}/transcricao.md`) === 'desprotegido') {
    throw new Error(`Nada foi copiado: o Git não ignora wiki/raw/${pasta}/transcricao.md, e a cópia guarda a fala inteira, inclusive dado sensível. Rode /aula-pronta:iniciar de novo (ele conserta o .gitignore; se houver uma linha "!" liberando esse caminho, remova-a) e repita.`);
  }
  const destino = join(raiz, 'wiki', 'raw', pasta, 'transcricao.md');
  const hashOrigem = sha256(readFileSync(origem));
  if (existsSync(destino)) {
    if (sha256(readFileSync(destino)) === hashOrigem) return { pasta, sha256: hashOrigem, status: 'ja-existia' };
    if (!substituir) throw new Error(`A cópia em wiki/raw/${pasta}/transcricao.md é diferente da transcrição atual da aula. Ela não é sobrescrita sozinha: pergunte ao infoprodutor e, só com o "sim", repita com --substituir.`);
  }
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(origem, destino);
  if (sha256(readFileSync(destino)) !== hashOrigem) throw new Error(`A cópia de ${pasta} saiu diferente do original. Nada foi registrado.`);
  return { pasta, sha256: hashOrigem, status: 'copiada' };
}

export function hoje(agora = new Date()) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`;
}

// Só registra a aula que já tem cópia fiel em wiki/raw e página em wiki/aulas: o registro é a prova do que foi processado.
export function registrar(raiz, pastas, { data = hoje(), bloco, substituir = false } = {}) {
  exigirCurso(raiz);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`Data inválida: "${data}". Use AAAA-MM-DD.`);
  const ruim = linhasMalformadas(raiz)[0];
  if (ruim) throw new Error(`Corrija a linha ${ruim.numero} do registro.md antes de registrar (${ruim.motivo}: "${ruim.texto}"): registrar reescreve a tabela e perderia essa linha. Nada foi registrado. Pergunte ao infoprodutor se for preciso.`);
  const registro = lerRegistro(raiz);
  const numeroBloco = bloco ?? Math.max(0, ...[...registro.values()].map((r) => r.bloco)) + 1;
  const feitas = [];
  const jaRegistradas = [];
  for (const pasta of pastas) {
    exigirAula(raiz, pasta);
    const raw = join(raiz, 'wiki', 'raw', pasta, 'transcricao.md');
    const origem = join(raiz, 'aulas', pasta, 'transcricao.md');
    if (!existsSync(raw)) throw new Error(`Falta a cópia wiki/raw/${pasta}/transcricao.md. Rode "copiar ${pasta}" antes.`);
    const paginaDaAula = join(raiz, 'wiki', 'aulas', `${pasta}.md`);
    if (!existsSync(paginaDaAula)) throw new Error(`Falta a página wiki/aulas/${pasta}.md. Escreva a página antes de registrar a aula.`);
    const hash = sha256(readFileSync(raw));
    if (existsSync(origem) && sha256(readFileSync(origem)) !== hash) throw new Error(`A transcrição de ${pasta} mudou depois da cópia. Nada foi registrado.`);
    const atestado = lerCabecalho(ler(paginaDaAula))[CAMPO_HASH];
    if (atestado !== hash) {
      throw new Error(`A página wiki/aulas/${pasta}.md não atesta esta transcrição: o campo ${CAMPO_HASH} do cabeçalho ${atestado ? `é ${atestado}` : 'não existe'}, e a cópia em wiki/raw tem o hash ${hash}. Reescreva a página a partir da cópia (e refaça os conceitos) com "${CAMPO_HASH}: ${hash}" no cabeçalho, e só então registre. Nada foi registrado.`);
    }
    const antiga = registro.get(pasta);
    if (antiga && !substituir) {
      if (antiga.sha === hash) { jaRegistradas.push(pasta); continue; }
      throw new Error(`${pasta} já está no registro com outra transcrição. Para processá-la de novo, pergunte ao infoprodutor e repita com --substituir.`);
    }
    registro.set(pasta, { sha: hash, data, bloco: numeroBloco });
    feitas.push(pasta);
  }
  if (feitas.length) escreverRegistro(raiz, registro);
  return { bloco: numeroBloco, data, registradas: feitas, jaRegistradas };
}

// Cabeçalho das páginas: bloco "---" no começo, uma linha "chave: valor" por campo (o valor vai até o fim da linha).
export function lerCabecalho(texto) {
  const m = texto.replace(/^﻿/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  const campos = {};
  if (!m) return campos;
  for (const linha of m[1].split('\n')) {
    const c = linha.match(/^([\w-]+):[ \t]*(.*)$/);
    if (c) campos[c[1]] = c[2].trim();
  }
  return campos;
}

const arquivosMd = (raiz, tipo) => (ehPasta(join(raiz, 'wiki', tipo)) ? readdirSync(join(raiz, 'wiki', tipo)).filter((f) => f.endsWith('.md')).sort() : []);
// Em wiki/aulas/, só vale .md com número no nome (as páginas de aula). Os outros (LEIAME.md, notas) são ignorados.
const ehPaginaDeAula = (f) => numeroDaPasta(f.slice(0, -3)) !== null;

function paginas(raiz, tipo) {
  const dir = join(raiz, 'wiki', tipo);
  return arquivosMd(raiz, tipo).filter((f) => tipo !== 'aulas' || ehPaginaDeAula(f)).map((f) => ({ arquivo: `${tipo}/${f}`, id: f.slice(0, -3), campos: lerCabecalho(ler(join(dir, f))) }));
}

// Link de markdown: cada trecho do caminho codificado (espaço = %20, % = %25, # = %23, ( = %28...), senão o nome da
// aula com espaço, "%", "#" ou "(" vira link quebrado.
export const codificarLink = (caminho) =>
  caminho.split('/').map((parte) => encodeURIComponent(parte).replace(/[()]/g, (c) => (c === '(' ? '%28' : '%29'))).join('/');

const nomeDoCurso = (raiz) => {
  const config = join(raiz, 'aula-pronta.config');
  return (existsSync(config) && ler(config).match(/^nome-do-curso:[ \t]*(.+)$/m)?.[1].trim()) || 'Curso';
};

export function indice(raiz) {
  exigirCurso(raiz);
  const problemas = [];
  const aulas = paginas(raiz, 'aulas');
  const conceitos = paginas(raiz, 'conceitos');
  for (const a of aulas) {
    for (const campo of ['numero', 'titulo', 'modulo', 'duracao', 'resumo']) if (!a.campos[campo]) problemas.push(`${a.arquivo}: falta o campo "${campo}" no cabeçalho`);
    if (a.campos.numero && a.campos.numero !== numeroDaPasta(a.id)) problemas.push(`${a.arquivo}: numero "${a.campos.numero}" não é o prefixo da pasta da aula ("${numeroDaPasta(a.id)}")`);
  }
  for (const c of conceitos) {
    for (const campo of ['nome', 'definicao']) if (!c.campos[campo]) problemas.push(`${c.arquivo}: falta o campo "${campo}" no cabeçalho`);
  }
  if (problemas.length) throw new Error(`Não dá para montar o índice:\n- ${problemas.join('\n- ')}`);
  aulas.sort((a, b) => compararPastas(a.id, b.id));
  conceitos.sort((a, b) => a.campos.nome.localeCompare(b.campos.nome, 'pt-BR'));
  const linhas = [
    `# Índice da wiki: ${nomeDoCurso(raiz)}`,
    '',
    'Uma linha por página. Este arquivo é refeito a cada ingestão: não edite à mão.',
    '',
    `## Aulas (${aulas.length})`,
    '',
    ...aulas.map((a) => `- [Aula ${a.campos.numero}: ${a.campos.titulo}](${codificarLink(a.arquivo)}) · Módulo: ${a.campos.modulo} · ${a.campos.duracao} · ${a.campos.resumo}`),
    '',
    `## Conceitos (${conceitos.length})`,
    '',
    ...conceitos.map((c) => `- [${c.campos.nome}](${codificarLink(c.arquivo)}) · ${c.campos.definicao}`),
    '',
  ];
  writeFileSync(join(raiz, 'wiki', 'indice.md'), linhas.join('\n'));
  const ignoradas = arquivosMd(raiz, 'aulas').filter((f) => !ehPaginaDeAula(f)).map((f) => `aulas/${f}`);
  return { aulas: aulas.length, conceitos: conceitos.length, ignoradas, reordenados: ordenarAulasDosConceitos(raiz) };
}

// Links "[texto](alvo)" de um texto. O alvo vem sem espaço (ou entre <...>), com título opcional. Alvo com espaço sem <...>
// não é link em markdown: volta com `espaco: true` para o conferir apontar.
function linksDoTexto(texto) {
  const achados = [];
  for (const [, dentro] of texto.matchAll(/\[[^\]\n]*\]\(([^)\n]*)\)/g)) {
    if (!dentro.trim()) continue;
    const m = dentro.match(/^\s*<([^<>]+)>\s*(?:"[^"]*")?\s*$/) ?? dentro.match(/^\s*([^\s<>]+)(?:\s+"[^"]*")?\s*$/);
    achados.push(m ? { alvo: m[1] } : { alvo: dentro.trim(), espaco: true });
  }
  return achados;
}

// Caminho de um alvo, sem âncora nem busca, decodificado. Se o "%" não forma código válido, vale o texto como está.
function caminhoDoAlvo(alvo) {
  const bruto = alvo.split(/[#?]/)[0];
  try {
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
}

// Pasta da aula para a qual o link da linha aponta (../aulas/<pasta>.md), ou null.
function aulaDaLinha(linha) {
  if (!linha.includes('](')) return null;
  for (const { alvo, espaco } of linksDoTexto(linha)) {
    if (espaco) continue;
    const m = posix.normalize(caminhoDoAlvo(alvo).replace(/\\/g, '/')).match(/^\.\.\/aulas\/([^/]+)\.md$/);
    if (m) return m[1];
  }
  return null;
}

const TITULO_AULAS = /^##\s+Aulas onde aparece\s*:?\s*$/i;
const MARCADOR = /^\s*(?:[-*+]|\d+[.)])\s+/;
const TITULO = /^(#{1,6})\s/;

// Percorre as linhas de um conceito dizendo, para cada uma, se está dentro de "## Aulas onde aparece".
// "## Avisos de contradição" é escrita pela verificação e cita aulas fora da lista: não conta como citação solta.
const TITULO_AVISOS = /^##\s+Avisos de contradi[çc][ãa]o\s*:?\s*$/i;
function secoesDoConceito(linhas) {
  let dentro = false;
  let temSecao = false;
  let nosAvisos = false;
  const dentroDosAvisos = [];
  const dentroDaSecao = linhas.map((linha) => {
    const t = linha.match(TITULO);
    if (t) {
      if (TITULO_AULAS.test(linha)) dentro = temSecao = true;
      else if (t[1].length <= 2) dentro = false;
      if (t[1].length <= 2) nosAvisos = TITULO_AVISOS.test(linha);
    }
    dentroDosAvisos.push(nosAvisos);
    return dentro;
  });
  return { dentroDaSecao, temSecao, dentroDosAvisos };
}

// Itens de "## Aulas onde aparece": uma linha com marcador na primeira coluna, mais as linhas seguintes (sub-item recuado,
// continuação) até o próximo marcador, linha em branco ou título. Devolve [{ ini, fim }] (fim exclusivo), em ordem.
const ITEM = /^(?:[-*+]|\d+[.)])\s+/;
function itensDaSecao(linhas, dentroDaSecao) {
  const itens = [];
  for (let i = 0; i < linhas.length;) {
    if (!dentroDaSecao[i] || !ITEM.test(linhas[i])) { i++; continue; }
    let fim = i + 1;
    while (fim < linhas.length && dentroDaSecao[fim] && linhas[fim].trim() !== '' && !ITEM.test(linhas[fim]) && !TITULO.test(linhas[fim])) fim++;
    itens.push({ ini: i, fim });
    i = fim;
  }
  return itens;
}

// Põe os itens de "## Aulas onde aparece" de cada conceito na ordem dos números das aulas (reingerir uma aula antiga
// acrescenta o item no fim). Cada item anda com o sub-item e a continuação dele; o que fica entre itens (linha em branco,
// texto solto) não sai do lugar. Devolve os conceitos que mudou.
function ordenarAulasDosConceitos(raiz) {
  const dir = join(raiz, 'wiki', 'conceitos');
  const mudaram = [];
  if (!ehPasta(dir)) return mudaram;
  const chave = (linha) => { const p = aulaDaLinha(linha); return p === null ? null : numeroDaPasta(p); };
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const original = readFileSync(join(dir, f), 'utf8');
    const quebra = original.includes('\r\n') ? '\r\n' : '\n';
    const linhas = original.split(/\r?\n/);
    const itens = itensDaSecao(linhas, secoesDoConceito(linhas).dentroDaSecao);
    // Um grupo é uma sequência de itens sem título no meio (duas seções com o mesmo nome não se misturam).
    const grupos = [];
    for (const item of itens) {
      const anterior = grupos.at(-1)?.at(-1);
      if (anterior && !linhas.slice(anterior.fim, item.ini).some((l) => TITULO.test(l))) grupos.at(-1).push(item);
      else grupos.push([item]);
    }
    let mudou = false;
    for (const grupo of grupos.reverse()) {
      const conteudo = grupo.map((it, k) => ({ k, n: chave(linhas[it.ini]), linhas: linhas.slice(it.ini, it.fim) }));
      const ordenados = [...conteudo].sort((a, b) => {
        if (a.n === null || b.n === null) return (a.n === null) - (b.n === null) || a.k - b.k;
        return compararNumeros(a.n, b.n) || a.k - b.k;
      });
      if (ordenados.every((o, i) => o.k === i)) continue;
      const entre = grupo.slice(1).map((it, k) => linhas.slice(grupo[k].fim, it.ini));
      const novo = ordenados.flatMap((o, i) => (i < entre.length ? [...o.linhas, ...entre[i]] : o.linhas));
      linhas.splice(grupo[0].ini, grupo.at(-1).fim - grupo[0].ini, ...novo);
      mudou = true;
    }
    if (!mudou) continue;
    writeFileSync(join(dir, f), linhas.join(quebra));
    mudaram.push(`conceitos/${f}`);
  }
  return mudaram;
}

// existsSync aceita "Adubo.md" para "adubo.md" no Windows e no Mac, e o link quebraria no Linux. Dentro de wiki/,
// confere o nome exato de cada trecho do caminho.
function existeComNomeExato(raiz, absoluto) {
  const rel = relative(join(raiz, 'wiki'), absoluto);
  if (rel.startsWith('..') || isAbsolute(rel)) return existsSync(absoluto);
  let atual = join(raiz, 'wiki');
  for (const parte of rel.split(sep).filter(Boolean)) {
    if (!ehPasta(atual) || !readdirSync(atual).includes(parte)) return false;
    atual = join(atual, parte);
  }
  return true;
}

// Links relativos que não levam a nenhum arquivo: [{ alvo, motivo }]. Link http(s), mailto e âncora na mesma página não entram.
export function linksQuebrados(raiz, arquivo) {
  const base = dirname(join(raiz, 'wiki', arquivo));
  const quebrados = [];
  for (const { alvo, espaco } of linksDoTexto(ler(join(raiz, 'wiki', arquivo)))) {
    if (espaco) {
      quebrados.push({ alvo, motivo: 'o endereço tem espaço (ou aspas soltas): escreva %20 no lugar do espaço, ou ponha o endereço entre < e >' });
      continue;
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(alvo)) continue;
    let caminho;
    try {
      caminho = decodeURIComponent(alvo.split(/[#?]/)[0]);
    } catch {
      quebrados.push({ alvo, motivo: 'o endereço tem um "%" que não forma um código válido: escreva %25 no lugar do "%"' });
      continue;
    }
    if (!caminho) continue;
    const absoluto = resolve(base, caminho);
    if (existeComNomeExato(raiz, absoluto)) continue;
    quebrados.push({ alvo, motivo: existsSync(absoluto) ? 'o arquivo existe, mas com letras maiúsculas ou minúsculas diferentes' : 'o arquivo não existe' });
  }
  return quebrados;
}

// Tira as linhas de uma aula de "## Aulas onde aparece" em todos os conceitos. É o primeiro passo de reingerir uma
// aula (rodada interrompida ou transcrição regravada): a skill escreve as linhas de novo, sem duplicar nem deixar
// conceito que a aula não cita mais. Nunca apaga uma página de conceito, mesmo a que ficou sem linhas.
export function limparConceitos(raiz, pasta) {
  exigirCurso(raiz);
  exigirNomeDeAula(pasta);
  const dir = join(raiz, 'wiki', 'conceitos');
  const resultado = [];
  const avisos = [];
  if (!ehPasta(dir)) return { aula: pasta, conceitos: resultado, avisos };
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const original = readFileSync(join(dir, f), 'utf8');
    const quebra = original.includes('\r\n') ? '\r\n' : '\n';
    const todas = original.split(/\r?\n/);
    const { dentroDaSecao, temSecao, dentroDosAvisos } = secoesDoConceito(todas);
    let removidas = 0;
    let restantes = 0;
    let citaFora = false;
    let cita = false;
    // Um item da aula sai inteiro: a linha, o sub-item e a continuação dela.
    const tirar = new Set();
    for (const { ini, fim } of itensDaSecao(todas, dentroDaSecao)) {
      if (aulaDaLinha(todas[ini]) === pasta) {
        removidas++;
        for (let i = ini; i < fim; i++) tirar.add(i);
      } else restantes++;
    }
    todas.forEach((linha, i) => {
      // Linha de aviso de contradição não é citação: é texto da verificação.
      if (dentroDosAvisos[i] || aulaDaLinha(linha) !== pasta) return;
      cita = true;
      if (!dentroDaSecao[i] && MARCADOR.test(linha)) citaFora = true;
    });
    const linhas = todas.filter((_, i) => !tirar.has(i));
    if (!removidas && cita && !temSecao) avisos.push({ arquivo: `conceitos/${f}`, aviso: `cita a aula ${pasta}, mas não tem a seção "## Aulas onde aparece": nada foi tirado` });
    else if (citaFora) avisos.push({ arquivo: `conceitos/${f}`, aviso: `cita a aula ${pasta} numa lista fora de "## Aulas onde aparece": confira se a seção tem outro título` });
    if (!removidas) continue;
    writeFileSync(join(dir, f), linhas.join(quebra));
    resultado.push({ arquivo: `conceitos/${f}`, removidas, restantes });
  }
  return { aula: pasta, conceitos: resultado, avisos };
}

export function conferir(raiz) {
  exigirCurso(raiz);
  const problemas = [];
  for (const [pasta, r] of lerRegistro(raiz)) {
    const raw = join(raiz, 'wiki', 'raw', pasta, 'transcricao.md');
    const origem = join(raiz, 'aulas', pasta, 'transcricao.md');
    const paginaDaAula = join(raiz, 'wiki', 'aulas', `${pasta}.md`);
    let copiaEmDia = false;
    if (!existsSync(raw)) problemas.push({ tipo: 'copia-ausente', arquivo: `wiki/raw/${pasta}/transcricao.md`, detalhe: 'a aula está no registro, mas a cópia não existe' });
    else {
      const hashCopia = sha256(readFileSync(raw));
      if (hashCopia === r.sha) copiaEmDia = true;
      else if (existsSync(origem) && sha256(readFileSync(origem)) === hashCopia) {
        problemas.push({ tipo: 'substituicao-interrompida', arquivo: `wiki/raw/${pasta}/transcricao.md`, detalhe: `a transcrição da aula mudou e a cópia em raw/ já é a nova, mas o registro ainda tem o hash antigo: a troca foi interrompida antes do registrar. Se o infoprodutor confirma que a aula foi regravada, repita "copiar ${pasta} --substituir" (a cópia já é a nova, nada muda), refaça a página (com ${CAMPO_HASH}: ${hashCopia}) e os conceitos (limpar-conceitos antes) e rode "registrar ${pasta} --substituir"` });
      } else problemas.push({ tipo: 'copia-alterada', arquivo: `wiki/raw/${pasta}/transcricao.md`, detalhe: 'o hash da cópia não é o do registro nem o da transcrição atual da aula' });
    }
    if (!existsSync(paginaDaAula)) problemas.push({ tipo: 'pagina-ausente', arquivo: `wiki/aulas/${pasta}.md`, detalhe: 'a aula está no registro, mas não tem página' });
    else if (copiaEmDia) {
      const atestado = lerCabecalho(ler(paginaDaAula))[CAMPO_HASH];
      if (atestado !== r.sha) problemas.push({ tipo: 'pagina-desatualizada', arquivo: `wiki/aulas/${pasta}.md`, detalhe: `o campo ${CAMPO_HASH} do cabeçalho ${atestado ? `é ${atestado}` : 'não existe'}, mas a transcrição registrada tem o hash ${r.sha}: a página não prova que saiu desta transcrição. Releia wiki/raw/${pasta}/transcricao.md, reescreva a página com "${CAMPO_HASH}: ${r.sha}" no cabeçalho, confira os conceitos dela e rode "registrar ${pasta}"` });
    }
  }
  const registro = lerRegistro(raiz);
  for (const pasta of registro.keys()) {
    if (!ehPasta(join(raiz, 'aulas', pasta))) {
      problemas.push({ tipo: 'aula-removida', arquivo: `wiki/aulas/${pasta}.md`, detalhe: `a aula ${pasta} está no registro, mas a pasta aulas/${pasta} não existe mais (apagada ou renomeada). A wiki mantém a página, a cópia em raw/ e as linhas nos conceitos, e o aula-pronta não apaga nada: decida com o infoprodutor entre restaurar a pasta ou apagar essas páginas à mão` });
    }
  }
  const arquivos = [...paginas(raiz, 'aulas'), ...paginas(raiz, 'conceitos')].map((p) => p.arquivo);
  if (existsSync(join(raiz, 'wiki', 'indice.md'))) arquivos.push('indice.md');
  for (const { numero, texto, motivo } of linhasMalformadas(raiz)) problemas.push({ tipo: 'registro-malformado', arquivo: 'wiki/registro.md', detalhe: `linha ${numero}: não entendi "${texto}" (${motivo}; o hash tem 64 caracteres minúsculos, a data é AAAA-MM-DD e o bloco é um número). A aula dela pode aparecer como nova, e o registrar recusa até a linha ser corrigida. Mostre a linha ao infoprodutor e corrija o registro.md com ele` });
  for (const a of paginas(raiz, 'aulas')) {
    if (registro.has(a.id)) continue;
    if (ehPasta(join(raiz, 'aulas', a.id)) && !existsSync(join(raiz, 'aulas', a.id, 'transcricao.md'))) problemas.push({ tipo: 'aula-sem-transcricao', arquivo: a.arquivo, detalhe: `a transcrição desta aula sumiu (aulas/${a.id}/transcricao.md não existe): gere de novo com o pos-gravacao; ingerir não resolve. A página fica como está e nada é apagado` });
    else if (ehPasta(join(raiz, 'aulas', a.id))) problemas.push({ tipo: 'aula-sem-registro', arquivo: a.arquivo, detalhe: 'tem página, mas a aula não está no registro: a ingestão dela foi interrompida. Rode a ingestão de novo (wiki-do-curso ingerir): ela refaz esta aula do começo, sem duplicar nada' });
    else problemas.push({ tipo: 'pagina-orfa', arquivo: a.arquivo, detalhe: `a página existe, mas a aula ${a.id} não está no registro e a pasta aulas/${a.id} não existe (a aula foi renomeada ou apagada no meio do trabalho). Rodar a ingestão de novo não resolve, e o aula-pronta não apaga nada: o infoprodutor decide entre restaurar a pasta (e ingerir) ou apagar à mão a página, a cópia em raw/ e as linhas dessa aula nos conceitos` });
  }
  for (const arquivo of arquivos) for (const { alvo, motivo } of linksQuebrados(raiz, arquivo)) problemas.push({ tipo: 'link-quebrado', arquivo: `wiki/${arquivo}`, detalhe: `${alvo}: ${motivo}` });
  return { ok: problemas.length === 0, paginas: arquivos.length, problemas };
}

function main(argv) {
  const [comando, ...resto] = argv;
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < resto.length; i++) {
    if (resto[i] === '--substituir') opcoes.substituir = true;
    else if (['--limite', '--data', '--bloco'].includes(resto[i])) opcoes[resto[i].slice(2)] = resto[++i];
    else posicionais.push(resto[i].replace(/^(?:\.[\\/])?aulas[\\/]/, '').replace(/[\\/]+$/, ''));
  }
  const raiz = process.cwd();
  const numero = (nome) => {
    if (opcoes[nome] === undefined) return undefined;
    const n = Number(opcoes[nome]);
    if (!Number.isInteger(n) || n < 1) throw new Error(`--${nome} precisa de um número inteiro maior que zero.`);
    return n;
  };
  const saida = (obj) => console.log(JSON.stringify(obj, null, 2));
  switch (comando) {
    case 'preparar': return saida(preparar(raiz));
    case 'novas': return saida(novas(raiz, numero('limite')));
    case 'copiar':
      if (!posicionais.length) throw new Error('Diga quais aulas copiar.');
      return saida(posicionais.map((p) => copiar(raiz, p, opcoes)));
    case 'registrar':
      if (!posicionais.length) throw new Error('Diga quais aulas registrar.');
      return saida(registrar(raiz, posicionais, { data: opcoes.data, bloco: numero('bloco'), substituir: opcoes.substituir }));
    case 'limpar-conceitos':
      if (!posicionais.length) throw new Error('Diga quais aulas limpar.');
      return saida(posicionais.map((p) => limparConceitos(raiz, p)));
    case 'indice': return saida(indice(raiz));
    case 'conferir': {
      const resultado = conferir(raiz);
      saida(resultado);
      if (!resultado.ok) process.exitCode = 1;
      return undefined;
    }
    default:
      throw new Error('Comando desconhecido. Use: preparar, novas, copiar, registrar, limpar-conceitos, indice ou conferir.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  }
}
