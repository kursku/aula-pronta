-- Filtro do pandoc para a página do material.
-- Link: só http, https, mailto e âncora (#) ficam como link; qualquer outro esquema (javascript:, data:, file:...)
-- e todo link sem esquema que não seja âncora (../transcricao.md, ./x, x.md, /x, //host/x) vira só o texto do link:
-- a CSP protege a página, mas não bloqueia navegação, e o PDF guarda o link como anotação.
-- Imagem: só arquivo relativo dentro da pasta da aula (o pandoc a embute); remota, absoluta ou fora da pasta
-- derruba a geração com IMAGEM_REJEITADA, em vez de uma imagem quebrada em silêncio. Só entra arquivo de imagem
-- (png, jpg, jpeg, gif, webp, svg): outro tipo viraria <embed>/<video>/<audio> (a CSP bloqueia, e some sem aviso)
-- ou embutiria na página um arquivo qualquer da pasta (notes.txt, o próprio material.md); isso derruba com IMAGEM_TIPO.
local PERMITIDOS = { http = true, https = true, mailto = true }
local TIPOS_IMAGEM = { png = true, jpg = true, jpeg = true, gif = true, webp = true, svg = true }

-- Navegador ignora espaço e caractere de controle dentro do esquema ("java\tscript:").
local function esquema(alvo)
  local limpo = (alvo:gsub('[%c%s]', ''))
  return limpo:match('^([%a][%w+.-]*):'), limpo
end

function Link(l)
  local e, limpo = esquema(l.target)
  if e then
    if PERMITIDOS[e:lower()] then return l end
  elseif limpo:sub(1, 1) == '#' then
    return l
  end
  return l.content
end

function Image(i)
  local e, limpo = esquema(i.src)
  if e and e:lower() == 'data' then
    if limpo:lower():match('^data:image/') then return i end
    error('IMAGEM_TIPO:' .. i.src:sub(1, 40))
  end
  if e
    or limpo:match('^[/\\]')
    or limpo:match('^//')
    or limpo:match('%%2[eEfF]')
    or limpo:match('%%5[cC]')
    or ('/' .. limpo:gsub('\\', '/') .. '/'):match('/%.%./')
  then
    error('IMAGEM_REJEITADA:' .. i.src)
  end
  local ext = limpo:gsub('[?#].*$', ''):match('%.(%w+)$')
  if not (ext and TIPOS_IMAGEM[ext:lower()]) then error('IMAGEM_TIPO:' .. i.src) end
  return i
end
