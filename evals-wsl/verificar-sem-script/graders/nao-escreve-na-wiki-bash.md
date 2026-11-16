---
type: tool_used
tool: Bash
input_match: '\bsed\b[^\n;&|]*\s-\w*i\b|\bsed\b[^\n;&|]*--in-place|\btee\b|\brm\b[^\n;&|]*\bwiki\b|\b(?:mv|cp)\s+(?:-\S+\s+)*\S+\s+\S*wiki\b|&?>>?\s*(?!&|/dev/null)\S*wiki\b|\bcd\b[^\n;&|]*\bwiki\b[^\n]*(?<![-=0-9])>>?\s*(?!&|/)\S'
min: 0
max: 0
---
