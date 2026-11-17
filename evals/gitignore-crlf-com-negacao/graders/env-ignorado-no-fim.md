---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules\/\r\n\.env\r\n\.env\.\*\r\n!\.env\r\n!\.env\.example\r\n(?:[^\n]*\n)*(?:\.env|/\.env|\*\*/\.env|\.env\*)\r?(?:\n|$)'
---
