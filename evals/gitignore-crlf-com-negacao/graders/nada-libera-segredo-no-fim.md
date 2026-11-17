---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules\/\r\n\.env\r\n\.env\.\*\r\n!\.env\r\n!\.env\.example\r\n(?:(?!!)[^\n]*\n|!(?=[^\n]*(?:example|sample|template))[^\n]*\n)*(?:(?!!)[^\n]+|!(?=[^\n]*(?:example|sample|template))[^\n]+)?$'
---
