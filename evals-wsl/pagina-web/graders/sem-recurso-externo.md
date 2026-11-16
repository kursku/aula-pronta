---
type: regex
target:
  source: file
  path: aulas/01-luz-e-agua/material.html
flags: i
match: not_contains
pattern: '<(link|script|iframe|video|audio|source|object|embed)\b|<img[^>]+src="(?!data:)|<image\b[^>]*href="(?!data:)|url\('
---
