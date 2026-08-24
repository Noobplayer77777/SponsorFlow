import sys
import re

path = 'frontend/app/companies/[id]/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setBody and setSubject usage
content = content.replace(
    "setBody(prev => (prev ? res.data.sentence + '\\n\\n' + prev : res.data.sentence));",
    "setComposer(prev => ({ ...prev, body: prev.body ? res.data.sentence + '\\n\\n' + prev.body : res.data.sentence }));"
)

content = content.replace(
    "setBody(suggestedReply);",
    "setComposer(prev => ({ ...prev, body: suggestedReply, subject: `Re: ${company.companyName} Sponsorship` }));"
)

content = content.replace(
    "setSubject(`Re: ${company.companyName} Sponsorship`);",
    ""
)

# Also fix the text area where the AI button was injected. We used 'value={body}' but it should be 'value={composer.body}'
content = content.replace(
    'value={body}',
    'value={composer.body}'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed state references")
