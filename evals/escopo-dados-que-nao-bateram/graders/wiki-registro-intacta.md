---
type: regex
target:
  source: file
  path: wiki/registro.md
pattern: '^# Registro da wiki\r?\n\r?\nUma linha por aula já ingerida: a pasta da aula, o hash \(sha256\) da transcrição que entrou, a data e o bloco\.\r?\nO aula-pronta só processa a aula que não está aqui\. Quem escreve este arquivo é o comando de ingestão: não edite à mão\.\r?\n\r?\n\| Aula \| Transcrição \(sha256\) \| Ingerida em \| Bloco \|\r?\n\|-{3}\|-{3}\|-{3}\|-{3}\|\r?\n\| 03-plantando-as-mudas \| 89614d37a6bc19299a7403c4fd7840885545b62fba0252c8743a92b678467f78 \| 2026-11-01 \| 1 \|\r?\n\| 04-adubando-a-horta \| 7b0357726d7b345af0478e7eb42329c8b71d9d01b3d136f87f6a432596bef9a8 \| 2026-11-01 \| 1 \|\r?\n\| 05-folhas-amarelas-e-pragas \| bc9e27cd1d4a676823dd73ebe9f3ce78bf6866e8b2858d056ca2b99995e4cc7c \| 2026-11-01 \| 1 \|\s*$'
---
