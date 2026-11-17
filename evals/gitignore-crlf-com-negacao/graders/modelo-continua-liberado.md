---
type: regex
target:
  source: file
  path: .gitignore
match: not_contains
pattern: '(?:^|\n)(?:(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*)|(?:/|\*\*/)?\.env\.example) *\r?(?:\n|$)(?:(?!(?:(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*)|(?:/|\*\*/)?\.env\.example) *\r?(?:\n|$)|!(?:/|\*\*/)?\.env\.example *\r?(?:\n|$))(?:[^\n]+(?:\n|$)|\n))*$'
---
