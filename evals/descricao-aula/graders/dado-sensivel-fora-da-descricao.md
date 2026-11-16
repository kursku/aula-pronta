---
type: regex
target:
  source: file
  path: aulas/01-luz-e-agua/descricao.md
flags: i
match: not_contains
pattern: 'horta\W*2026|rega\W{0,3}verde|verde\W{0,3}7421|7421|marina\W*(ponto\W*)?horta'
---
