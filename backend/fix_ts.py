import re

files = [
    'src/controllers/followUp.controller.ts',
    'src/controllers/notification.controller.ts'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Cast req.query assignments
    content = re.sub(r'req\.query\.userId;', r'req.query.userId as string | undefined;', content)
    content = re.sub(r'req\.query\.companyId;', r'req.query.companyId as string | undefined;', content)
    # req.user?.id
    content = re.sub(r'req\.user\?\.id;', r'req.user?.id as string;', content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

with open('src/queues/followUp.queue.ts', 'r', encoding='utf-8') as f:
    q_content = f.read()

q_content = q_content.replace('repeat: {', 'repeat: {') # Wait, I will just cast the options object
q_content = re.sub(r'(await followUpQueue\.add\(\'check-due-follow-ups\', \{\},\s*\{)(.*?)\}\);', r'\1\2} as any);', q_content, flags=re.DOTALL)

with open('src/queues/followUp.queue.ts', 'w', encoding='utf-8') as f:
    f.write(q_content)
