'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
};

async function safeGenerate(prompt: string, fallback: string): Promise<string> {
  const model = getModel();
  if (!model) return fallback;
  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI Generation Failed:', error);
    return fallback;
  }
}

export async function generatePersonalizedIntro(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  const prompt = `Write exactly ONE professional and highly personalized opening sentence for an email to a sponsor.
  Context:
  Company Name: ${company.companyName}
  Industry: ${company.industry || 'Unknown'}
  Website: ${company.website || 'Unknown'}
  Location: ${company.location || 'Unknown'}
  Company Description: ${company.aiSummary || 'Not provided'}
  
  The sentence should be appreciative of their work or mission based on the description, without mentioning sponsorship yet.
  Only return the single sentence, no greetings or sign-offs.`;

  const fallback = `I've been closely following the impactful work ${company.companyName} has been doing in the ${company.industry || 'tech'} space.`;
  const text = await safeGenerate(prompt, fallback);
  return { success: true, text };
}

export async function generateCompanySummary(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  const prompt = `Act as an expert corporate researcher. Create a very concise, structured summary (in markdown bullet points) about the company: ${company.companyName}.
  
  Known details:
  Industry: ${company.industry}
  Website: ${company.website}
  
  Include these exact headers:
  - **Industry Position:**
  - **Key Products/Services:**
  - **Developer Programs / APIs:** (if applicable)
  - **CSR / Initiatives:**
  - **Recent News / Activities:**
  
  Make educated guesses based on the industry and company name if they are famous, otherwise extract general patterns for a company in that sector. Keep each bullet to 1 sentence.`;

  const fallback = `- **Industry Position:** Leading company in the ${company.industry || 'tech'} sector.
- **Key Products/Services:** Enterprise software and consumer solutions.
- **Developer Programs / APIs:** Active developer community and open APIs.
- **CSR / Initiatives:** Committed to sustainability and education.
- **Recent News / Activities:** Recently expanded their core product line.`;

  const summary = await safeGenerate(prompt, fallback);
  
  await prisma.company.update({
    where: { id: companyId },
    data: { aiSummary: summary }
  });

  return { success: true, summary };
}

export async function suggestReply(companyId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');

  const company = await prisma.company.findUnique({ where: { id: companyId } });

  const prompt = `You are a professional sponsorship coordinator. Generate a polite, concise, and professional reply to the following response from a potential sponsor.
  
  Context of their reply: "${content}"
  Company: ${company?.companyName || 'Unknown'}
  Company Description: ${company?.aiSummary || 'Not provided'}
  
  Instructions:
  - Keep it under 3 short paragraphs.
  - Be polite and appreciative.
  - If they asked a question, address it professionally.
  - Do not include placeholders like [Your Name]. Just write the body of the email.`;

  const fallback = `Thank you for getting back to us so quickly.\n\nWe appreciate your response and look forward to the possibility of collaborating. Please let me know if you need any further information from our end.`;
  const suggestion = await safeGenerate(prompt, fallback);
  return { success: true, suggestion };
}

export async function draftFullEmail(companyId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Company not found");

  const prompt = `You are an expert sponsorship outreach coordinator. Draft a full, highly personalized cold outreach email to a potential sponsor.
  
  Context about the target company:
  Company Name: ${company.companyName}
  Industry: ${company.industry || "Unknown"}
  Website: ${company.website || "Unknown"}
  Company Description: ${company.aiSummary || "Not provided"}
  
  Instructions:
  - Write a catchy, professional Subject Line on the first line, prefixed with "SUBJECT: ".
  - Write the body of the email starting on the next lines.
  - Make the email concise, persuasive, and tailored precisely to what the company does (based on their description).
  - Show how partnering with us aligns with their specific products or mission.
  - End with a clear, low-friction call to action (e.g., a quick 10-minute chat).
  - Do not use placeholders like [Company Name], use the actual name.
  - You can use [My Name] for the sender signature.`;

  const fallback = `SUBJECT: Exploring a partnership with ${company.companyName}\n\nHi team,\n\nI love what you are doing at ${company.companyName}. We are looking for sponsors and think you would be a great fit. Let us chat!\n\nBest,\n[My Name]`;

  const rawText = await safeGenerate(prompt, fallback);
  
  let subject = "Sponsorship Opportunity";
  let body = rawText;
  
  const subjectMatch = rawText.match(/^SUBJECT:\s*(.+)$/im);
  if (subjectMatch) {
    subject = subjectMatch[1].trim();
    body = rawText.replace(subjectMatch[0], "").trim();
  }

  return { success: true, subject, body };
}

