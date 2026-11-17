---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules\/\r?\n\.env\r?\n\.env\.\*\r?\n!\.env\r?\n!\.env\.production\.example\r?\ntranscricao\.md\r?\ngravacao\.srt\r?\n(?:(?!!)[^\n]*\n|!(?=[^\n]*(?:example|sample|template))[^\n]*\n)*(?:(?!!)[^\n]+|!(?=[^\n]*(?:example|sample|template))[^\n]+)?$'
---
