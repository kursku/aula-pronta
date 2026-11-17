#!/usr/bin/env node
// Gera a página web (material.html) e o PDF (material.pdf) do material do aluno, com a marca do curso.
// Uso: node gerar-material.mjs <pasta-da-aula> [--so-pagina]
//      node gerar-material.mjs --instalar-pandoc   (só depois do "sim" do infoprodutor)
// O pandoc faz a página com o modelo do plugin; o Chrome ou o Edge sem janela imprime o PDF.
// Sem dependências. Exit: 0 ok, 2 uso ou arquivo, 5 sem pandoc, 6 sem navegador, 7 navegador falhou.
import { constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MODELO = new URL('../modelo.html', import.meta.url);
const FILTRO = fileURLToPath(new URL('../filtro.lua', import.meta.url));
// O material é texto, não marcação: o que não é Markdown simples fica como texto na página. Sem HTML cru (<tag> falada
// vira texto, e native_divs/native_spans também recriariam <div> e <span> com atributos), sem atributos de {chaves},
// sem matemática ($ de preço), sem bloco YAML, sem aspas tipográficas, sem as extensões do pandoc que mudam o texto.
// `footnotes` fica ligado de propósito: desligado, a linha `[^1]: nota` vira definição de link e o texto some.
export const SEM = ['raw_html', 'raw_tex', 'raw_attribute', 'tex_math_dollars', 'yaml_metadata_block', 'smart', 'native_divs', 'native_spans', 'fenced_divs', 'bracketed_spans', 'link_attributes', 'header_attributes', 'fenced_code_attributes', 'inline_code_attributes', 'citations', 'superscript', 'subscript', 'line_blocks', 'definition_lists', 'fancy_lists', 'pandoc_title_block', 'inline_notes'];
export const entradaPandoc = (sem = SEM) => `markdown${sem.map((e) => `-${e}`).join('')}`;
const TEMPO_PDF_MS = 120_000;
const TEMPO_TRAVA_MS = TEMPO_PDF_MS + 30_000;
const TEMPO_TRAVA_VIVA_MS = 30 * 60_000;
const NOME_TRAVA = '.aula-pronta.lock';
const NOME_ESTADO_TRAVA = 'estado.json';
const TEMPO_INSTALACAO_MS = 600_000;
const PADRAO = { 'nome-do-curso': 'Meu Curso', logo: '', 'cor-principal': '#1F2937', 'cor-secundaria': '#6B7280', rodape: '' };
const TIPOS_LOGO = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

class Falha extends Error {
  constructor(codigo, mensagem) {
    super(mensagem);
    this.codigo = codigo;
  }
}

// Texto dentro de uma string CSS (rodapé impresso): `<` vira escape para não fechar o <style>.
export const escaparCss = (t) =>
  t.replace(/[\\"]/g, (c) => `\\${c}`).replace(/</g, '\\3c ').replace(/[\r\n]+/g, ' ');

export const escaparHtml = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Linhas `chave: valor`; `#` só comenta no começo da linha (o valor de uma cor começa com #).
export function lerConfig(texto) {
  const config = { ...PADRAO };
  for (const linha of texto.replace(/^﻿/, '').split(/\r?\n/)) {
    const m = linha.match(/^\s*([a-z-]+)\s*:(.*)$/);
    if (m && !linha.trimStart().startsWith('#') && m[1] in PADRAO) config[m[1]] = tirarAspas(m[2].trim());
  }
  return config;
}

// "Curso Chique" e 'logo.png' valem como Curso Chique e logo.png: o infoprodutor não programa e põe aspas.
// Só quando o valor inteiro é um par de aspas sem outra aspa igual dentro: `"Curso A" e "B"` fica como está.
const tirarAspas = (v) => v.match(/^(["'])((?:(?!\1).)*)\1$/)?.[2].trim() ?? v;

// A cor entra no CSS: só #RRGGBB, senão a página poderia carregar CSS alheio.
export function validarCores(config) {
  for (const chave of ['cor-principal', 'cor-secundaria']) {
    if (!/^#[0-9a-fA-F]{6}$/.test(config[chave])) {
      throw new Falha(2, `A ${chave} do aula-pronta.config ("${config[chave]}") não é uma cor no formato #RRGGBB. Corrija e rode de novo.`);
    }
  }
}

// O logo vai dentro da página (data URI), para a página não depender de nenhum arquivo.
export function logoEmbutido(config, pastaCurso) {
  if (!config.logo) return '';
  const caminho = resolve(pastaCurso, config.logo);
  const fora = (de, para) => {
    const rel = relative(de, para);
    return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  };
  const dentro = `O logo (${config.logo}) precisa ficar dentro da pasta do curso.`;
  if (fora(pastaCurso, caminho)) throw new Falha(2, dentro);
  const tipo = TIPOS_LOGO[extname(caminho).toLowerCase()];
  if (!tipo) throw new Falha(2, `O logo (${config.logo}) precisa ser uma imagem png, jpg, jpeg, gif, webp ou svg.`);
  if (!existsSync(caminho)) throw new Falha(2, `Não encontrei o logo ${config.logo} na pasta do curso. Corrija o aula-pronta.config ou deixe o logo em branco.`);
  // Um link simbólico dentro da pasta pode apontar para fora dela: confere o destino de verdade.
  if (fora(realpathSync(pastaCurso), realpathSync(caminho))) throw new Falha(2, dentro);
  if (!statSync(caminho).isFile()) throw new Falha(2, `O logo (${config.logo}) precisa ser um arquivo de imagem, não uma pasta.`);
  try {
    return `<img src="data:${tipo};base64,${readFileSync(caminho).toString('base64')}" alt="">`;
  } catch (e) {
    throw new Falha(2, `Não consegui ler o logo ${config.logo} (${e.code ?? e.message}).`);
  }
}

// O modelo é um template do pandoc: `$` do texto precisa virar `$$`. A marca entra por aqui (e não por -V)
// porque o logo em base64 estoura o limite de tamanho da linha de comando do Windows.
// O logo entra depois do pandoc: o --embed-resources reescreve o <img> do modelo (tira o alt, põe role="img").
const MARCA_LOGO = '<!--aula-pronta-logo-->';

export function montarModelo(modelo, { config, titulo, logo }) {
  const valores = {
    '{{TITULO}}': escaparHtml(titulo),
    '{{NOME}}': escaparHtml(config['nome-do-curso']),
    '{{RODAPE}}': escaparHtml(config.rodape),
    '{{RODAPE_CSS}}': escaparCss(config.rodape),
    '{{COR_PRINCIPAL}}': config['cor-principal'],
    '{{COR_SECUNDARIA}}': config['cor-secundaria'],
    '{{LOGO}}': logo ? MARCA_LOGO : '',
  };
  return modelo.replace(/\{\{[A-Z_]+\}\}/g, (marca) => (valores[marca] ?? marca).replaceAll('$', '$$$$'));
}

const existe = (c) => existsSync(c) && statSync(c).isFile();

const caminhoFora = (raiz, alvo) => {
  const rel = relative(raiz, alvo);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
};

function processoVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return !['ESRCH', 'EINVAL', 'ERR_OUT_OF_RANGE'].includes(e.code);
  }
}

function lerEstadoTrava(trava) {
  try {
    const estado = JSON.parse(readFileSync(join(trava, NOME_ESTADO_TRAVA), 'utf8'));
    return { pid: estado?.pid, criadoEm: estado?.criadoEm, token: estado?.token };
  } catch {
    return null;
  }
}

function mensagemTravaOcupada(trava, julgamento) {
  const pid = Number.isInteger(julgamento.estado?.pid) && julgamento.estado.pid > 0 ? julgamento.estado.pid : 'desconhecido';
  const idade = Number.isFinite(julgamento.idade) ? Math.max(0, Math.floor(julgamento.idade / 60_000)) : 0;
  const restante = Number.isFinite(julgamento.limite - julgamento.idade) ? Math.max(1, Math.ceil((julgamento.limite - julgamento.idade) / 60_000)) : 1;
  return `Já existe outra geração desta aula em andamento (PID ${pid}). A trava foi criada há ${idade} min e expira sozinha em até ${restante} min. Se você fechou a execução e tem certeza, apague a pasta ${trava}.`;
}

function mesmaTrava(a, b) {
  if (a === null) return b === null;
  if (b === null) return false;
  if (a.token !== undefined || b.token !== undefined) return a.token !== undefined && a.token === b.token;
  return a.pid === b.pid && a.criadoEm === b.criadoEm;
}

export function adquirirTrava(aula, { renomear = renameSync, agora = Date.now, processoVivo: verificarPid = processoVivo, pid = process.pid, gravarEstado = writeFileSync, criarToken = randomUUID, remover = rmSync } = {}) {
  const trava = join(aula, NOME_TRAVA);
  const token = criarToken();
  try {
    mkdirSync(trava);
  } catch (e) {
    if (e.code === 'EEXIST') {
      const opcoes = { agora, processoVivo: verificarPid };
      const julgamento = travaAbandonada(trava, opcoes);
      if (!julgamento.abandonada) throw new Falha(2, mensagemTravaOcupada(trava, julgamento));
      const morta = `${trava}.${pid}.${agora()}.morta`;
      try {
        renomear(trava, morta);
      } catch (recuperacao) {
        const atual = travaAbandonada(trava, opcoes);
        throw new Falha(2, `${mensagemTravaOcupada(trava, atual)} (${recuperacao.code ?? recuperacao.message}).`);
      }
      if (!mesmaTrava(julgamento.estado, lerEstadoTrava(morta))) {
        if (!existsSync(trava)) {
          try {
            renomear(morta, trava);
          } catch {
            // Preserve a trava movida se outra execução ocupou o caminho.
          }
        } else {
          try {
            remover(morta, { recursive: true, force: true });
          } catch {
            // Best-effort: preserve the current lock and report it as occupied.
          }
        }
        throw new Falha(2, mensagemTravaOcupada(trava, travaAbandonada(trava, opcoes)));
      }
      try {
        mkdirSync(trava);
        rmSync(morta, { recursive: true, force: true });
      } catch (recuperacao) {
        try {
          rmSync(morta, { recursive: true, force: true });
        } catch {
          // Outra geração pode ter tomado a trava; não apague o caminho original.
        }
        throw new Falha(2, `${mensagemTravaOcupada(trava, travaAbandonada(trava, opcoes))} (${recuperacao.code ?? recuperacao.message}).`);
      }
    }
    if (e.code !== 'EEXIST') throw new Falha(2, `Não consegui criar a trava da geração (${e.code ?? e.message}).`);
  }
  const dono = { pid, criadoEm: agora(), token };
  try {
    gravarEstado(join(trava, NOME_ESTADO_TRAVA), JSON.stringify(dono));
  } catch (e) {
    try {
      rmSync(trava, { recursive: true, force: true });
    } catch {
      // The lock directory was created by this acquisition.
    }
    throw new Falha(2, `Não consegui criar a trava da geração (${e.code ?? e.message}).`);
  }
  return () => liberarTrava(trava, dono);
}

function travaAbandonada(trava, { agora = Date.now, processoVivo: verificarPid = processoVivo } = {}) {
  const estado = lerEstadoTrava(trava);
  let criadoEm = estado?.criadoEm;
  if (!Number.isFinite(criadoEm)) {
    try {
      criadoEm = Math.floor(statSync(trava).mtimeMs);
    } catch {
      criadoEm = 0;
    }
  }
  const idade = Number.isFinite(criadoEm) ? agora() - criadoEm : Infinity;
  const vivo = Number.isInteger(estado?.pid) && estado.pid > 0 && verificarPid(estado.pid);
  const limite = vivo ? TEMPO_TRAVA_VIVA_MS : TEMPO_TRAVA_MS;
  return { abandonada: idade < 0 || idade >= limite, estado, idade, limite };
}

export function liberarTrava(trava, dono, remover = rmSync) {
  try {
    const estado = JSON.parse(readFileSync(join(trava, NOME_ESTADO_TRAVA), 'utf8'));
    if (dono === undefined || dono === null || !mesmaTrava(estado, dono)) return;
    remover(trava, { recursive: true, force: true });
  } catch (e) {
    if (e.code === 'ENOENT' && !existsSync(trava)) return;
    console.error(`Não consegui liberar a trava ${trava} (${e.code ?? e.message}). Remova-a somente se tiver certeza de que processo morreu.`);
  }
}

export function acharPandoc(env = process.env, plataforma = process.platform) {
  if (env.AULA_PRONTA_PANDOC !== undefined) return existe(env.AULA_PRONTA_PANDOC) ? env.AULA_PRONTA_PANDOC : null;
  if (spawnSync('pandoc', ['--version'], { stdio: 'ignore' }).status === 0) return 'pandoc';
  // Recém-instalado pelo winget ou brew, o pandoc ainda pode não estar no PATH desta sessão.
  const fixos =
    plataforma === 'win32'
      ? [join(env.LOCALAPPDATA ?? '', 'Pandoc', 'pandoc.exe'), join(env.ProgramFiles ?? '', 'Pandoc', 'pandoc.exe')]
      : ['/opt/homebrew/bin/pandoc', '/usr/local/bin/pandoc'];
  return fixos.find(existe) ?? null;
}

export function acharNavegador(env = process.env, plataforma = process.platform) {
  if (env.AULA_PRONTA_NAVEGADOR !== undefined) return existe(env.AULA_PRONTA_NAVEGADOR) ? env.AULA_PRONTA_NAVEGADOR : null;
  let candidatos;
  if (plataforma === 'win32') {
    const pastas = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean);
    candidatos = [
      ...pastas.map((p) => join(p, 'Google', 'Chrome', 'Application', 'chrome.exe')),
      ...pastas.map((p) => join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
    ];
  } else if (plataforma === 'darwin') {
    const apps = ['/Applications', join(env.HOME ?? '', 'Applications')];
    candidatos = apps.flatMap((a) => [
      join(a, 'Google Chrome.app/Contents/MacOS/Google Chrome'),
      join(a, 'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
    ]);
  } else {
    const dirs = ['/usr/bin', '/usr/local/bin', '/opt/google/chrome', '/opt/microsoft/msedge', '/snap/bin'];
    const nomes = ['google-chrome', 'google-chrome-stable', 'chrome', 'microsoft-edge', 'microsoft-edge-stable', 'chromium', 'chromium-browser'];
    candidatos = dirs.flatMap((d) => nomes.map((n) => join(d, n)));
  }
  return candidatos.find(existe) ?? null;
}

// Só a linha de comando muda por sistema; quem decide instalar é o infoprodutor (a skill pede o "sim").
export function comandoInstalarPandoc(plataforma = process.platform) {
  if (plataforma === 'win32') {
    // Sem --scope: o manifesto do winget não declara escopo (um --scope user poderia excluir o instalador).
    // --disable-interactivity: sem pergunta de texto escondida. Ele não evita o pedido de permissão do Windows (UAC);
    // o que protege de travar é o timeout do spawnSync.
    return ['winget', ['install', '--id', 'JohnMacFarlane.Pandoc', '-e', '--accept-source-agreements', '--accept-package-agreements', '--disable-interactivity']];
  }
  if (plataforma === 'darwin') return ['brew', ['install', 'pandoc']];
  return null;
}

// Páginas por objeto /Type /Page (independente do /Count).
export const paginasPorObjeto = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;

// O /Count da árvore de páginas é a fonte; os objetos /Page ficam de reserva.
export function contarPaginas(pdf) {
  const contagens = [...pdf.toString('latin1').matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return contagens.length ? Math.max(...contagens) : paginasPorObjeto(pdf);
}

// Aceita o PDF só com cabeçalho %PDF- e ao menos uma página; devolve o número de páginas.
export function validarPdf(pdf) {
  if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return { erro: 'O arquivo que saiu não é um PDF.' };
  const paginas = contarPaginas(pdf);
  return paginas < 1 ? { erro: 'O PDF saiu sem páginas.' } : { paginas };
}

// A limpeza do perfil temporário não pode esconder o resultado real (no Windows o navegador pode ainda segurar a pasta).
function limparSemFalhar(pasta) {
  try {
    rmSync(pasta, { recursive: true, force: true });
  } catch {
    // fica no temporário do sistema; o sistema limpa depois
  }
}

// Só remove saída antiga no instante da publicação, depois de toda a geração passar.
function apagarGerado(arquivo) {
  conferirDestino(arquivo);
  try {
    rmSync(arquivo, { force: true });
  } catch (e) {
    throw new Falha(2, `Não consegui apagar ${basename(arquivo)} da rodada anterior (${e.code ?? e.message}). Se ele está aberto em outro programa, feche e rode de novo.`);
  }
}

function conferirDestino(arquivo) {
  try {
    if (existsSync(arquivo) && !statSync(arquivo).isFile()) {
      throw Object.assign(new Error('a saída não é um arquivo regular'), { code: 'EISDIR' });
    }
  } catch (e) {
    throw new Falha(2, `Não consegui apagar ${basename(arquivo)} da rodada anterior (${e.code ?? e.message}). Se ele está aberto em outro programa, feche e rode de novo.`);
  }
}

// Endereços de todas as imagens do material, como o pandoc as lê (a mesma entrada da página, sem o filtro).
function imagensDoMaterial(pandoc, material) {
  const r = spawnSync(pandoc, ['-f', entradaPandoc(), '-t', 'json', material], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Falha(2, `O pandoc não conseguiu ler o material: ${(r.stderr || r.error?.message || '').trim()}`);
  const achadas = [];
  const andar = (no) => {
    if (Array.isArray(no)) no.forEach(andar);
    else if (no && typeof no === 'object') {
      if (no.t === 'Image') achadas.push(no.c[2][0]);
      Object.values(no).forEach(andar);
    }
  };
  andar(JSON.parse(r.stdout).blocks);
  return achadas;
}

// O pandoc segue link simbólico e junction: uma imagem que "está" na pasta da aula pode ser um arquivo de fora.
// O filtro barra caminho absoluto e ".."; aqui se confere o destino de verdade, antes de gerar qualquer coisa.
export function conferirImagens(aula, enderecos) {
  const raiz = realpathSync(aula);
  const arquivos = [];
  for (const endereco of enderecos) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(endereco.replace(/[\s\x00-\x1f]/g, ''))) continue; // data: e afins: o filtro decide
    let relativo = endereco.replace(/[?#].*$/, '');
    try {
      relativo = decodeURIComponent(relativo);
    } catch {
      // endereço com % solto: fica como está
    }
    let real;
    try {
      real = realpathSync(resolve(aula, relativo));
    } catch {
      continue; // não existe: a checagem depois do pandoc explica
    }
    if (caminhoFora(raiz, real)) {
      throw new Falha(2, `A imagem "${endereco}" do material.md aponta, por atalho ou link, para um arquivo fora da pasta da aula. Use uma imagem que esteja de verdade dentro dela.`);
    }
    if (!statSync(real).isFile()) throw new Falha(2, `O arquivo "${endereco}" do material.md não é um arquivo regular. Use um arquivo de imagem, não uma pasta ou outro tipo especial.`);
    if (!TIPOS_LOGO[extname(relativo).toLowerCase()]) throw new Falha(2, `O arquivo "${endereco}" do material.md não é uma imagem que a página aceita: use png, jpg, jpeg, gif, webp ou svg.`);
    arquivos.push({ endereco, relativo, real });
  }
  return arquivos;
}

// Temporário com nome único, criado com COPYFILE_EXCL: um .tmp ou link simbólico deixado na pasta nunca é seguido nem sobrescrito.
export function publicarArquivo(origem, destino, { copiar = copyFileSync, renomear = renameSync, remover = rmSync } = {}) {
  const temporario = `${destino}.${process.pid}.${Date.now()}.tmp`;
  try {
    copiar(origem, temporario, constants.COPYFILE_EXCL);
    renomear(temporario, destino);
  } catch (e) {
    try {
      remover(temporario, { force: true });
    } catch {
      // A mensagem principal é a falha da publicação.
    }
    throw new Falha(7, `Não consegui gravar ${basename(destino)} (${e.code ?? e.message}). Se ele está aberto em outro programa, feche e rode de novo.`);
  }
}

export function copiarImagens(aula, destino, enderecos) {
  const arquivos = enderecos.every((e) => typeof e === 'string') ? conferirImagens(aula, enderecos) : enderecos;
  for (const { relativo, real } of arquivos) {
    if (!TIPOS_LOGO[extname(relativo).toLowerCase()]) throw new Falha(2, `O arquivo "${relativo}" do material.md não é uma imagem que a página aceita: use png, jpg, jpeg, gif, webp ou svg.`);
    const arquivo = resolve(destino, relativo);
    if (caminhoFora(destino, arquivo)) throw new Falha(2, `A imagem "${relativo}" não cabe na pasta temporária da execução.`);
    mkdirSync(dirname(arquivo), { recursive: true });
    copyFileSync(real, arquivo);
  }
}

function gerarPagina({ pandoc, material, aula, saida, modelo }) {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-pronta-'));
  try {
    const arquivoModelo = join(pasta, 'modelo.html');
    writeFileSync(arquivoModelo, modelo);
    const r = spawnSync(
      pandoc,
      [
        '-f', entradaPandoc(), '-t', 'html5', '-s', '--wrap=none',
        `--template=${arquivoModelo}`, `--lua-filter=${FILTRO}`,
        // Imagens da pasta da aula entram dentro da página (a CSP só deixa data:); o filtro barra remota e fora da pasta.
        '--embed-resources', `--resource-path=${aula}`,
        '-o', saida, material,
      ],
      { encoding: 'utf8' },
    );
    const rejeitada = r.stderr?.match(/IMAGEM_REJEITADA:(.*)/)?.[1].trim();
    if (rejeitada) {
      throw new Falha(2, `A imagem "${rejeitada}" do material.md não pode entrar: use uma imagem que esteja dentro da pasta da aula (sem endereço da internet, sem caminho absoluto e sem "..").`);
    }
    const tipo = r.stderr?.match(/IMAGEM_TIPO:(.*)/)?.[1].trim();
    if (tipo) {
      throw new Falha(2, `O arquivo "${tipo}" do material.md não é uma imagem que a página aceita: use png, jpg, jpeg, gif, webp ou svg.`);
    }
    if (r.status !== 0) throw new Falha(2, `O pandoc não conseguiu gerar a página: ${(r.stderr || r.error?.message || '').trim()}`);
    const solta = readFileSync(saida, 'utf8').match(/<img\b[^>]*\ssrc="(?!data:)([^"]*)"/i)?.[1];
    if (solta !== undefined) {
      apagarGerado(saida);
      throw new Falha(2, `Não encontrei a imagem "${solta}" do material.md na pasta da aula. Coloque o arquivo lá ou tire a imagem do texto.`);
    }
  } finally {
    limparSemFalhar(pasta);
  }
}

// executar e copiar são injetáveis só nos testes (falha de cópia e timeout sem navegador real).
export function imprimirPdf({ navegador, pagina, saida }, { executar = spawnSync, copiar = copyFileSync } = {}) {
  const pasta = mkdtempSync(join(tmpdir(), 'aula-pronta-pdf-'));
  try {
    const temporario = join(pasta, 'material.pdf');
    // Perfil próprio: sem ele, um Chrome já aberto atende o pedido e o PDF nunca sai.
    // --headless=new: o motor antigo de Chrome e Edge velhos ignora as margens de página (rodapé e número).
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--user-data-dir=${join(pasta, 'perfil')}`,
      `--print-to-pdf=${temporario}`,
      pathToFileURL(pagina).href,
    ];
    const r = executar(navegador, args, { encoding: 'utf8', timeout: TEMPO_PDF_MS });
    if (r.error?.code === 'ETIMEDOUT') {
      throw new Falha(7, `O navegador (${basename(navegador)}) demorou mais de ${TEMPO_PDF_MS / 60_000} minutos e foi interrompido. Feche as janelas dele e rode de novo.`);
    }
    const falhou = (motivo) => new Falha(7, `O navegador (${basename(navegador)}) não conseguiu imprimir o PDF. ${motivo}`.trim());
    const detalhe = (r.stderr || r.error?.message || '').trim().split('\n').slice(-3).join(' ');
    const codigoSaida = r.status ?? r.signal ?? 'desconhecida';
    const motivoSaida = `saída ${codigoSaida}${detalhe ? `: ${detalhe}` : ''}`;
    if (r.status !== 0) throw falhou(motivoSaida);
    if (!existe(temporario)) throw falhou(motivoSaida);
    const { erro, paginas } = validarPdf(readFileSync(temporario));
    if (erro) throw falhou(erro);
    publicarArquivo(temporario, saida, { copiar });
    return paginas;
  } finally {
    limparSemFalhar(pasta);
  }
}

export function gerar(pastaAula, { soPagina = false, env = process.env, plataforma = process.platform, onAfterCopy = null, imprimir = imprimirPdf } = {}) {
  const aula = resolve(pastaAula);
  const curso = dirname(dirname(aula));
  if (basename(dirname(aula)) !== 'aulas') {
    throw new Falha(2, `${pastaAula} não é uma pasta de aula (aulas/NN-nome). Passe a pasta da aula.`);
  }
  let raizAulas;
  let aulaReal;
  try {
    raizAulas = realpathSync(dirname(aula));
  } catch (e) {
    throw new Falha(2, `${pastaAula} precisa ficar dentro de aulas da pasta do curso (${e.code ?? e.message}).`);
  }
  try {
    aulaReal = realpathSync(aula);
  } catch (e) {
    throw new Falha(2, `${pastaAula} precisa ficar dentro de aulas da pasta do curso (${e.code ?? e.message}).`);
  }
  if (relative(raizAulas, dirname(aulaReal)) !== '') throw new Falha(2, `${pastaAula} precisa ficar dentro de aulas da pasta do curso.`);
  const aulaEsperada = join(raizAulas, basename(aula));
  const mesmaAula = plataforma === 'win32' ? aulaEsperada.toLowerCase() === aulaReal.toLowerCase() : aulaEsperada === aulaReal;
  if (!mesmaAula) throw new Falha(2, `${pastaAula} precisa ser uma pasta de aula real dentro de aulas.`);
  const material = join(aula, 'material.md');
  if (!existe(material)) throw new Falha(2, `Não encontrei ${join(basename(dirname(aula)), basename(aula), 'material.md')}. Rode /aula-pronta:pos-gravacao nesta aula primeiro.`);
  const raizAula = aulaReal;
  let materialReal;
  try {
    materialReal = realpathSync(material);
  } catch (e) {
    if (e.code === 'ENOENT') throw new Falha(2, `Não encontrei ${join(basename(dirname(aula)), basename(aula), 'material.md')}. Rode /aula-pronta:pos-gravacao nesta aula primeiro.`);
    throw new Falha(2, `Não consegui conferir o material.md (${e.code ?? e.message}).`);
  }
  if (caminhoFora(raizAula, materialReal)) throw new Falha(2, 'O material.md precisa ficar dentro da pasta da aula.');
  const arquivoConfig = join(curso, 'aula-pronta.config');
  if (!existe(arquivoConfig)) throw new Falha(2, 'Não encontrei o aula-pronta.config na pasta do curso. Rode /aula-pronta:iniciar primeiro.');

  const pagina = join(aula, 'material.html');
  const pandoc = acharPandoc(env, plataforma);
  if (!pandoc) throw new Falha(5, 'Falta o pandoc, o programa que monta a página do material.');

  const config = lerConfig(readFileSync(arquivoConfig, 'utf8'));
  validarCores(config);
  const texto = readFileSync(materialReal, 'utf8');
  const titulo = texto.match(/^#[ \t]+(.+?)[ \t]*$/m)?.[1] ?? 'Material do aluno';
  const logo = logoEmbutido(config, curso);
  const modelo = montarModelo(readFileSync(MODELO, 'utf8'), { config, titulo, logo });
  const enderecos = imagensDoMaterial(pandoc, materialReal);

  const liberar = adquirirTrava(aula);
  try {
    const execucao = mkdtempSync(join(tmpdir(), 'aula-pronta-gerar-'));
    try {
      const entrada = join(execucao, 'aula');
      mkdirSync(entrada);
      const materialEntrada = join(entrada, 'material.md');
      const paginaEntrada = join(entrada, 'material.html');
      const pdfEntrada = join(entrada, 'material.pdf');
      copyFileSync(materialReal, materialEntrada);
      copiarImagens(aula, entrada, enderecos);
      onAfterCopy?.();

      // ponytail: uma trava por aula serializa gerações; só precisa de trava mais fina se throughput importar.
      gerarPagina({ pandoc, material: materialEntrada, aula: entrada, saida: paginaEntrada, modelo });
      if (logo) writeFileSync(paginaEntrada, readFileSync(paginaEntrada, 'utf8').replace(MARCA_LOGO, () => logo));
      const resultado = { pagina, pdf: null, paginas: 0 };
      const publicar = (origem, destino) => {
        publicarArquivo(origem, destino);
      };
      if (soPagina) {
        conferirDestino(pagina);
        publicar(paginaEntrada, pagina);
        return resultado;
      }

      const navegador = acharNavegador(env, plataforma);
      if (!navegador) {
        conferirDestino(pagina);
        publicar(paginaEntrada, pagina);
        apagarGerado(join(aula, 'material.pdf'));
        throw Object.assign(new Falha(6, 'Faltam o Google Chrome e o Microsoft Edge: o PDF é impresso por um deles. A página web já foi gerada.'), { resultado });
      }
      const pdf = join(aula, 'material.pdf');
      try {
        resultado.paginas = imprimir({ navegador, pagina: paginaEntrada, saida: pdfEntrada });
      } catch (e) {
        throw Object.assign(e, { resultado });
      }
      try {
        conferirDestino(pagina);
        conferirDestino(pdf);
        publicar(pdfEntrada, pdf);
        publicar(paginaEntrada, pagina);
      } catch (e) {
        throw Object.assign(e, { resultado });
      }
      resultado.pdf = pdf;
      return resultado;
    } finally {
      limparSemFalhar(execucao);
    }
  } finally {
    liberar();
  }
}

function instalarPandoc() {
  if (acharPandoc()) {
    console.log('O pandoc já está instalado.');
    return 0;
  }
  const comando = comandoInstalarPandoc();
  if (!comando) {
    console.error('Não sei instalar o pandoc neste sistema. Instale pelo gerenciador de pacotes dele (https://pandoc.org/installing.html) e rode de novo.');
    return 2;
  }
  const r = spawnSync(comando[0], comando[1], { stdio: 'inherit', timeout: TEMPO_INSTALACAO_MS });
  if (r.error?.code === 'ETIMEDOUT') {
    console.error('A instalação do pandoc demorou mais de 10 minutos e foi interrompida. Instale por https://pandoc.org/installing.html e rode de novo.');
    return 2;
  }
  if (r.error) {
    const gerenciador = comando[0] === 'winget' ? 'o winget' : 'o Homebrew (brew)';
    console.error(`Não consegui rodar ${gerenciador}. Instale o pandoc por https://pandoc.org/installing.html e rode de novo.`);
    return 2;
  }
  if (r.status !== 0) console.error('A instalação do pandoc não terminou. Instale por https://pandoc.org/installing.html e rode de novo.');
  return r.status ?? 2;
}

function main(argumentos) {
  if (argumentos[0] === '--instalar-pandoc') return instalarPandoc();
  const soPagina = argumentos.includes('--so-pagina');
  const [pasta] = argumentos.filter((a) => !a.startsWith('--'));
  if (!pasta) {
    console.error('Uso: node gerar-material.mjs <pasta-da-aula> [--so-pagina]');
    return 2;
  }
  try {
    const { pagina, pdf, paginas } = gerar(pasta, { soPagina });
    console.log(`Página: ${pagina}`);
    if (pdf) console.log(`PDF: ${pdf}${paginas ? ` (${paginas} páginas)` : ''}`);
    return 0;
  } catch (e) {
    if (!(e instanceof Falha)) throw e;
    console.error(e.message);
    if (e.resultado?.pagina && existsSync(e.resultado.pagina)) console.log(`Página: ${e.resultado.pagina}`);
    return e.codigo;
  }
}

// realpath dos dois lados: chamado por junction ou symlink, o script ainda roda.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
