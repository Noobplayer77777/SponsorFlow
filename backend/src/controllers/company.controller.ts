import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

// --- ZOD SCHEMAS ---
const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  email: z.string().email("Invalid email format").optional().nullable().or(z.literal('')),
  website: z.string().url("Invalid URL").optional().nullable().or(z.literal('')),
  industry: z.string().optional().nullable(),
  linkedin: z.string().url("Invalid LinkedIn URL").optional().nullable().or(z.literal('')),
  phoneNumber: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum([
    'NOT_ASSIGNED', 'ASSIGNED', 'EMAIL_DRAFTED', 'EMAIL_SENT', 
    'OPENED', 'REPLIED', 'INTERESTED', 'NEGOTIATING', 'CONFIRMED', 'REJECTED'
  ]).optional(),
});

// --- API CONTROLLERS ---

export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, industry, page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const whereClause: any = {};

    // Search logic
    if (search) {
      whereClause.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter logic
    if (status) whereClause.status = status;
    if (industry) whereClause.industry = industry;

    // Security constraints for MEMBER
    if (req.user?.role === 'MEMBER') {
      whereClause.OR = [
        ...(whereClause.OR || []),
      ];
      whereClause.AND = [
        {
          OR: [
            { status: 'NOT_ASSIGNED' },
            { assignment: { userId: req.user.id } }
          ]
        }
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        skip,
        take: limitNumber,
        orderBy: { createdAt: 'desc' },
        include: { assignment: { include: { user: { select: { name: true, email: true } } } } }
      }),
      prisma.company.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: { 
        assignment: { include: { user: { select: { name: true } } } },
        notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        replies: { orderBy: { createdAt: 'desc' } },
        activities: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        emails: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!company) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    // MEMBER access check
    if (req.user?.role === 'MEMBER' && company.status !== 'NOT_ASSIGNED') {
      if (company.assignment?.userId !== req.user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
    }

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = companySchema.parse(req.body);

    if (validatedData.email && validatedData.email.trim() !== '') {
      const existing = await prisma.company.findFirst({
        where: { email: validatedData.email }
      });
      if (existing) {
        res.status(400).json({ success: false, message: 'Company with this email already exists' });
        return;
      }
    }

    const company = await prisma.company.create({
      data: validatedData
    });
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = companySchema.partial().parse(req.body);

    const existingCompany = await prisma.company.findUnique({
      where: { id: req.params.id as string },
      include: { assignment: true }
    });

    if (!existingCompany) {
      res.status(404).json({ success: false, message: 'Company not found' });
      return;
    }

    if (req.user?.role === 'MEMBER' && existingCompany.status !== 'NOT_ASSIGNED') {
      if (existingCompany.assignment?.userId !== req.user.id) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }
    }

    const company = await prisma.company.update({
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
    
    res.json({ success: true, data: company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, errors: error.issues });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.company.delete({
      where: { id: req.params.id as string }
    });
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- CSV IMPORT ---

export const importCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No CSV file uploaded' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    if (!fileContent.trim()) {
      res.status(400).json({ success: false, message: 'CSV file is empty' });
      return;
    }

    let records: any[];
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError) {
      res.status(400).json({ success: false, message: 'Malformed CSV file' });
      return;
    }

    const validRecords = [];
    const errors = [];
    const seenEmails = new Set<string>();

    for (const [index, record] of records.entries()) {
      const rowNum = index + 2;
      
      try {
        const mappedData = {
          companyName: record.companyName || record.name || record.Company || '',
          contactPerson: record.contactPerson || record.contact || '',
          designation: record.designation || record.title || '',
          email: record.email || '',
          website: record.website || '',
          industry: record.industry || '',
          linkedin: record.linkedin || '',
          phoneNumber: record.phoneNumber || record.phone || '',
          location: record.location || '',
        };

        const validated = companySchema.parse(mappedData);
        
        const emailToTrack = validated.email?.toLowerCase();
        if (emailToTrack && emailToTrack !== '') {
          if (seenEmails.has(emailToTrack)) {
            errors.push({ row: rowNum, message: `Duplicate email within CSV: ${emailToTrack}` });
            continue;
          }
          seenEmails.add(emailToTrack);
        }

        validRecords.push(validated);
      } catch (zodError: any) {
        errors.push({ row: rowNum, message: zodError.issues.map((e: any) => e.message).join(', ') });
      }
    }

    if (validRecords.length === 0) {
      res.status(400).json({ success: false, message: 'No valid records found to import', errors });
      return;
    }

    const emailsToCheck = Array.from(seenEmails);
    const existingCompanies = await prisma.company.findMany({
      where: { email: { in: emailsToCheck } },
      select: { email: true }
    });
    const existingEmails = new Set(existingCompanies.map(c => c.email?.toLowerCase()));

    const recordsToInsert = validRecords.filter(r => {
      const email = r.email?.toLowerCase();
      if (email && existingEmails.has(email)) {
        errors.push({ row: 'DB Check', message: `Email already exists in database: ${email}` });
        return false;
      }
      return true;
    });

    if (recordsToInsert.length === 0) {
      res.status(400).json({ success: false, message: 'All valid records were duplicates of existing database entries', errors });
      return;
    }

    const result = await prisma.company.createMany({
      data: recordsToInsert,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: `Imported ${result.count} companies.`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, message: 'Server error during import' });
  }
};

