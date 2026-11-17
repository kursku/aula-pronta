---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^node_modules\/\r?\n\.env\r?\n\.env\.\*\r?\n!\.env\.prod\r?\ntranscricao\.md\r?\ngravacao\.srt\r?\n(?:[^\n]*\n)*(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*|(?:/|\*\*/)?\.env\.prod)\r?(?:\n|$)'
---
