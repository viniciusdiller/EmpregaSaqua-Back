import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  buildResumeStream(profile: any): PassThrough {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const pass = new PassThrough();
      
      doc.pipe(pass);

      // Header
      const userName = profile.user?.email ? profile.user.email.split('@')[0] : 'Candidato';
      doc.fontSize(24).font('Helvetica-Bold').text(userName, { align: 'center' });
      doc.moveDown(0.5);
      
      const contactInfo = [
        profile.user?.email || '',
        profile.telefone || '',
        profile.address || ''
      ].filter(Boolean).join(' | ');
      
      doc.fontSize(10).font('Helvetica').fillColor('gray').text(contactInfo, { align: 'center' });
      doc.moveDown(2);

      // Bio
      if (profile.bio) {
        doc.fontSize(14).fillColor('black').font('Helvetica-Bold').text('Resumo Profissional', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(profile.bio);
        doc.moveDown(1);
      }

      // Habilidades
      if (profile.skills && profile.skills.length > 0) {
        doc.fontSize(14).fillColor('black').font('Helvetica-Bold').text('Habilidades', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(profile.skills.join(', '));
        doc.moveDown(1);
      }

      // Experiência
      if (profile.experiences && profile.experiences.length > 0) {
        doc.fontSize(14).fillColor('black').font('Helvetica-Bold').text('Experiência Profissional', { underline: true });
        doc.moveDown(0.5);
        
        for (const exp of profile.experiences) {
          doc.fontSize(12).font('Helvetica-Bold').text(exp.role || 'Cargo não especificado');
          doc.fontSize(10).font('Helvetica-Oblique').text(`${exp.company || 'Empresa'} | ${exp.start_date} - ${exp.end_date || 'Atual'}`);
          if (exp.description) {
            doc.fontSize(10).font('Helvetica').text(exp.description);
          }
          doc.moveDown(0.5);
        }
        doc.moveDown(0.5);
      }

      // Formação
      if (profile.educations && profile.educations.length > 0) {
        doc.fontSize(14).fillColor('black').font('Helvetica-Bold').text('Formação Acadêmica', { underline: true });
        doc.moveDown(0.5);
        
        for (const edu of profile.educations) {
          doc.fontSize(12).font('Helvetica-Bold').text(`${edu.degree || ''} em ${edu.field_of_study || ''}`);
          doc.fontSize(10).font('Helvetica-Oblique').text(`${edu.institution || ''} | ${edu.start_date} - ${edu.end_date || 'Atual'}`);
          doc.moveDown(0.5);
        }
      }

      doc.end();
      return pass;
    } catch (error) {
      this.logger.error('Failed to generate PDF resume', error);
      throw new InternalServerErrorException('Error generating resume PDF');
    }
  }
}
