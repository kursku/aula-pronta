---
type: regex
target:
  source: file
  path: .gitignore
pattern: '^build\/\r?\n\.env\r?\n\.env\.\*\r?\n!\.env\r?\nbuild\/\r?\n(?:[^\n]*\n)*(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*)\r?(?:\n|$)'
---
