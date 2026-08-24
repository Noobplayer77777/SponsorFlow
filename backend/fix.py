import sys

with open('src/controllers/company.controller.ts', 'r') as f:
    content = f.read()

target = """    const company = await prisma.company.update({
      where: { id: req.params.id as string },
      data: validatedData
    });
    res.json({ success: true, data: company });"""

replacement = """    const company = await prisma.company.update({
      where: { id: req.params.id as string },
      data: validatedData
    });
    
    if (validatedData.status && existingCompany.status !== validatedData.status) {
      await logActivity(company.id, 'STATUS_CHANGED', `Status changed to ${validatedData.status}`, req.user!.id);
      if (validatedData.status === 'CONFIRMED' && existingCompany.assignment?.userId) {
        await createNotification(
          existingCompany.assignment.userId,
          'SPONSORSHIP_CONFIRMED',
          `Sponsorship confirmed for ${existingCompany.companyName}!`,
          company.id
        );
      }
    }
    
    res.json({ success: true, data: company });"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/controllers/company.controller.ts', 'w') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
