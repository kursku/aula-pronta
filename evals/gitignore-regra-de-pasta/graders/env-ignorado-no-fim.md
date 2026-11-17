---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules\/\r?\n\.env\/\r?\n\.env\*\/\r?\ntranscricao\.md\r?\ngravacao\.srt\r?\n(?:[^\n]*\n)*(?:\.env|/\.env|\*\*/\.env|\.env\*) *\r?(?:\n|$)'
---
