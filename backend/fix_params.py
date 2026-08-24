import os
import re

files = [
    'src/controllers/followUp.controller.ts',
    'src/controllers/notification.controller.ts',
    'src/controllers/company.controller.ts',
    'src/controllers/assignment.controller.ts',
    'src/controllers/reply.controller.ts',
    'src/controllers/gmail.controller.ts',
    'src/controllers/template.controller.ts'
]

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            c = f.read()
        
        # We need to cast req.params
        c = re.sub(r'const \{ (.*?) \} = req\.params;', r'const { \1 } = req.params as { \1: string };', c)
        c = re.sub(r'const id = req\.params\.id;', r'const id = req.params.id as string;', c)
        c = re.sub(r'const companyId = req\.params\.companyId;', r'const companyId = req.params.companyId as string;', c)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(c)

print("Fixed req.params")
