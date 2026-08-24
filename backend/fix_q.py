import os

q = 'src/queues/followUp.queue.ts'
with open(q, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
"""      {
        repeat: {
          pattern: '* * * * *', // Every minute
        },
        jobId: 'check-due-follow-ups-job', // idempotency key for the repeatable job itself
      }""", 
"""      ({
        repeat: {
          pattern: '* * * * *',
        },
        jobId: 'check-due-follow-ups-job',
      } as any)"""
)

with open(q, 'w', encoding='utf-8') as f:
    f.write(c)
