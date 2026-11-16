---
type: regex
target:
  source: file
  path: wiki/registro.md
pattern: '^# Registro da wiki\r?\n\r?\nUma linha por aula já ingerida: a pasta da aula, o hash \(sha256\) da transcrição que entrou, a data e o bloco\.\r?\nO aula-pronta só processa a aula que não está aqui\. Quem escreve este arquivo é o comando de ingestão: não edite à mão\.\r?\n\r?\n\| Aula \| Transcrição \(sha256\) \| Ingerida em \| Bloco \|\r?\n\|-{3}\|-{3}\|-{3}\|-{3}\|\r?\n\| 01-regando-as-mudas \| fcc049c9fe576866824be1ac3ecf20452dd387eda10d632517bbf200ca07a15d \| 2026-11-01 \| 1 \|\r?\n\| 02-regando-no-calor \| 11f7fc697ac6e9a227536f0bfe7f1744014bb97bdfcc6f9e7a62034a51865ca3 \| 2026-11-01 \| 1 \|\r?\n\s*$'
---
