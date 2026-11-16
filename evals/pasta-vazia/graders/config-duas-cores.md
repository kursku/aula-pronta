---
type: regex
target:
  source: file
  path: aula-pronta.config
flags: m
pattern: '^cor-principal: #[0-9A-Fa-f]{6}\r?$[\s\S]*^cor-secundaria: #[0-9A-Fa-f]{6}\r?$'
---
