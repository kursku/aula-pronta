---
type: regex
target:
  source: file
  path: aulas/01-luz-e-agua/material.md
flags: i
match: not_contains
pattern: 'fotoss[ií]ntese[^\n.]{0,120}noite|bateria|a[çc][úu]car[^\n.]{0,80}(noite|escuro|descans)'
---
