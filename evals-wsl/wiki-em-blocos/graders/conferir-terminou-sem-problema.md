---
type: llm
criteria: "Leia o trace. O comando `conferir` do wiki.mjs (o script da skill wiki-do-curso) foi chamado e a última chamada devolveu \"ok\": true, sem nenhum item em \"problemas\". Se ele devolveu \"ok\": false numa chamada, só aprove se uma chamada posterior de `conferir` devolveu \"ok\": true. Reprove se `conferir` nunca foi chamado ou se a última chamada devolveu problemas (exit code 1)."
focus: trace
---
