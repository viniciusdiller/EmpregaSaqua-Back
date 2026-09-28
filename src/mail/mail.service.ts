import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Envio de e-mail via SMTP (nodemailer). Configuração 100% por env — ver .env.example.
 * Sem SMTP_HOST configurado, o serviço só registra no log e não falha o resto do fluxo:
 * uma vaga aprovada não pode travar por causa de e-mail, e o dev local não precisa de SMTP.
 *
 * Templates HTML ficam em src/mail/templates/email/*.html, com placeholders {{variavel}}.
 * renderTemplate() escapa automaticamente todo valor interpolado (evita HTML injection
 * vindo de dados do usuário, como título de vaga ou nome de empresa).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly templatesDir = join(process.cwd(), 'src', 'mail', 'templates', 'email');

  constructor() {
    this.from = process.env.SMTP_FROM || 'EmpregaSaquá <no-reply@empregasaqua.com>';
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP_HOST não configurado — e-mails serão apenas logados, não enviados. Ver .env.example.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      // true = SMTPS direto (porta 465); false = STARTTLS (587/25), o mais comum em Gmail/Outlook.
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }

  /**
   * Carrega um template de src/mail/templates/email/{name}.html e substitui cada
   * {{variavel}} pelo valor correspondente em `vars` (HTML-escapado). Chaves sem
   * valor em `vars` viram string vazia.
   */
  async renderTemplate(name: string, vars: Record<string, string>): Promise<string> {
    const path = join(this.templatesDir, `${name}.html`);
    const raw = await readFile(path, 'utf-8');
    return raw.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => (key in vars ? this.escapeHtml(vars[key]!) : ''));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Nunca lança: um e-mail que falha não pode derrubar a ação que o disparou (ex.: aprovar vaga). */
  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[e-mail simulado] para=${to} assunto="${subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
