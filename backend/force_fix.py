import os

fup = 'src/controllers/followUp.controller.ts'
with open(fup, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('req.query.userId', '(req.query.userId as string)')
c = c.replace('req.query.companyId', '(req.query.companyId as string)')
with open(fup, 'w', encoding='utf-8') as f:
    f.write(c)

notf = 'src/controllers/notification.controller.ts'
with open(notf, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('req.query.userId', '(req.query.userId as string)')
with open(notf, 'w', encoding='utf-8') as f:
    f.write(c)

q = 'src/queues/followUp.queue.ts'
with open(q, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace("{ repeat: { pattern: '* * * * *' } }", "{ repeat: { pattern: '* * * * *' } } as any")
with open(q, 'w', encoding='utf-8') as f:
    f.write(c)

print("Done")
