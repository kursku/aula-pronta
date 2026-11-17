---
type: regex
target:
  source: file
  path: .gitignore
match: not_contains
pattern: '(?:^|\n)(?:(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*)|(?:/|\*\*/)?\.env\.production\.example) *\r?(?:\n|$)(?:(?!(?:(?:(?:/|\*\*/)?\.env\.\*|(?:/|\*\*/)?\.env\*)|(?:/|\*\*/)?\.env\.production\.example) *\r?(?:\n|$)|!(?:/|\*\*/)?\.env\.production\.example *\r?(?:\n|$))(?:[^\n]+(?:\n|$)|\n))*$'
---
