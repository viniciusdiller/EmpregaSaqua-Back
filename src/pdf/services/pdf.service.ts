import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as ejs from 'ejs';
import * as path from 'path';
import sanitizeHtml from 'sanitize-html';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generates a PDF resume stream from candidate profile data.
   * Defends against SSRF by strictly sanitizing all data injected into the template.
   */
  async generateResume(candidateProfile: any): Promise<Buffer> {
    try {
      // 1. Strict Sanitization (Defense against SSRF via XSS in PDF renderer)
      // We sanitize every text field to ensure no malicious tags (like <script>, <iframe>) 
      // can be executed by Puppeteer.
      const sanitizedData = this.sanitizeProfileData(candidateProfile);

      // 2. Resolve template path
      const templatePath = path.join(__dirname, '..', 'templates', 'resume.ejs');

      // 3. Render HTML using EJS
      const htmlContent = await ejs.renderFile(templatePath, { profile: sanitizedData });

      // 4. Generate PDF using Puppeteer (configured safely for VPS)
      const pdfBuffer = await this.generatePdfFromHtml(htmlContent);

      // 5. Save copy to /uploads/Curriculos for organized storage
      const { mkdir, writeFile } = await import('fs/promises');
      const curriculosDir = path.join(process.cwd(), 'uploads', 'Curriculos');
      await mkdir(curriculosDir, { recursive: true });

      const emailUsername = candidateProfile.user?.email?.split('@')[0] || 'usuario';
      const safeName = emailUsername.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeName}-Curriculo-${Date.now()}.pdf`;
      await writeFile(path.join(curriculosDir, filename), pdfBuffer);

      return pdfBuffer;
    } catch (error) {
      this.logger.error('Failed to generate PDF resume', error);
      throw new InternalServerErrorException('Error generating resume PDF');
    }
  }

  private sanitizeProfileData(profile: any): any {
    const sanitizeStr = (str: string | null | undefined) => 
      str ? sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }) : str;

    return {
      ...profile,
      bio: sanitizeStr(profile.bio),
      telefone: sanitizeStr(profile.telefone),
      address: sanitizeStr(profile.address),
      skills: profile.skills ? profile.skills.map(sanitizeStr) : [],
      experiences: profile.experiences ? profile.experiences.map((exp: any) => ({
        ...exp,
        company: sanitizeStr(exp.company),
        role: sanitizeStr(exp.role),
        description: sanitizeStr(exp.description),
        start_date: sanitizeStr(exp.start_date),
        end_date: sanitizeStr(exp.end_date),
      })) : [],
      educations: profile.educations ? profile.educations.map((edu: any) => ({
        ...edu,
        institution: sanitizeStr(edu.institution),
        degree: sanitizeStr(edu.degree),
        field_of_study: sanitizeStr(edu.field_of_study),
        start_date: sanitizeStr(edu.start_date),
        end_date: sanitizeStr(edu.end_date),
      })) : [],
      user: profile.user ? {
        email: sanitizeStr(profile.user.email),
      } : null,
    };
  }

  private async generatePdfFromHtml(html: string): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;
    try {
      // Launch Puppeteer with safe flags for VPS environments (no sandbox)
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      
      // Prevent SSRF by intercepting network requests and blocking anything 
      // outside of local `data:` or necessary resources.
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith('data:') || url === 'about:blank') {
          request.continue();
        } else {
          // Block external requests to prevent SSRF
          request.abort();
        }
      });

      // Set the HTML content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate the PDF as a buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });

      // return Buffer.from(pdfBuffer) because Puppeteer Uint8Array to Buffer compatibility
      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
