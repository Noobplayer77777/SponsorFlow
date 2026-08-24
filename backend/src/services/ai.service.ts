import { GoogleGenerativeAI } from '@google/generative-ai';

interface IAIService {
  generatePersonalizedIntro(companyDetails: any): Promise<string>;
  suggestReply(emailThread: string, latestReply: string): Promise<string>;
  generateCompanySummary(companyDetails: any): Promise<string>;
}

class GeminiAIService implements IAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  private async safeGenerate(prompt: string, fallback: string): Promise<string> {
    if (!this.model) {
      console.log('AI Service bypassed: No API key configured. Returning fallback.');
      return fallback;
    }
    
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error: any) {
      console.error('AI Generation Failed:', error.message);
      return fallback;
    }
  }

  async generatePersonalizedIntro(company: any): Promise<string> {
    const prompt = `Write exactly ONE professional and highly personalized opening sentence for an email to a sponsor.
    Context:
    Company Name: ${company.companyName}
    Industry: ${company.industry || 'Unknown'}
    Website: ${company.website || 'Unknown'}
    Location: ${company.location || 'Unknown'}
    
    The sentence should be appreciative of their work in their industry, without mentioning sponsorship yet.
    Only return the single sentence, no greetings or sign-offs.`;

    const fallback = `I've been closely following the impactful work ${company.companyName} has been doing in the ${company.industry || 'tech'} space.`;
    return this.safeGenerate(prompt, fallback);
  }

  async suggestReply(emailThread: string, latestReply: string): Promise<string> {
    const prompt = `You are a professional sponsorship coordinator. Generate a polite, concise, and professional reply to the following response from a potential sponsor.
    
    Context of their reply: "${latestReply}"
    
    Instructions:
    - Keep it under 3 short paragraphs.
    - Be polite and appreciative.
    - If they asked a question, address it professionally.
    - Do not include placeholders like [Your Name]. Just write the body of the email.`;

    const fallback = `Thank you for getting back to us so quickly.\n\nWe appreciate your response and look forward to the possibility of collaborating. Please let me know if you need any further information from our end.`;
    return this.safeGenerate(prompt, fallback);
  }

  async generateCompanySummary(company: any): Promise<string> {
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

    return this.safeGenerate(prompt, fallback);
  }
}

export const aiService = new GeminiAIService();
