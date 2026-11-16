---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules/\r?\n\.env\r?\n\.env\.\*\r?\n!\.env\r?\n!\.env\.example\r?\n\s*\.env\r?\n\.env\.\*\r?\n!\.env\.example\r?\ntranscricao\.md\r?\ngravacao\.srt\s*$'
---
