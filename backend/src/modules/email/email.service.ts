import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { SystemConfigService } from '@/modules/system-config/system-config.service';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly systemConfigService: SystemConfigService) {}

  private async getTransporter(): Promise<Transporter | null> {
    const config = await this.systemConfigService.getSmtpConfig();

    if (!config.enabled || !config.host || !config.user) {
      return null;
    }

    // Create transporter if not exists or config changed
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const transporter = await this.getTransporter();
      const config = await this.systemConfigService.getSmtpConfig();

      if (!transporter) {
        this.logger.warn('SMTP not configured, email not sent');
        return { success: false, error: 'SMTP not configured' };
      }

      const mailOptions = {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${result.messageId}`);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = await this.getTransporter();

      if (!transporter) {
        return { success: false, error: 'SMTP not configured' };
      }

      await transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Email templates for notifications
  async sendVacationRequestNotification(
    to: string,
    employeeName: string,
    startDate: string,
    endDate: string,
    days: number,
    requestType: 'new' | 'supervisor_approved' | 'approved' | 'rejected',
  ): Promise<EmailResult> {
    const subjects = {
      new: `Nueva solicitud de vacaciones - ${employeeName}`,
      supervisor_approved: `Solicitud de vacaciones pre-aprobada - ${employeeName}`,
      approved: `Solicitud de vacaciones aprobada`,
      rejected: `Solicitud de vacaciones rechazada`,
    };

    const bodies = {
      new: `
        <h2>Nueva Solicitud de Vacaciones</h2>
        <p><strong>${employeeName}</strong> ha solicitado vacaciones.</p>
        <ul>
          <li><strong>Fecha de inicio:</strong> ${startDate}</li>
          <li><strong>Fecha de fin:</strong> ${endDate}</li>
          <li><strong>Días solicitados:</strong> ${days}</li>
        </ul>
        <p>Por favor revise y apruebe o rechace esta solicitud en el sistema.</p>
      `,
      supervisor_approved: `
        <h2>Solicitud Pre-aprobada por Supervisor</h2>
        <p>La solicitud de vacaciones de <strong>${employeeName}</strong> ha sido pre-aprobada por su supervisor.</p>
        <ul>
          <li><strong>Fecha de inicio:</strong> ${startDate}</li>
          <li><strong>Fecha de fin:</strong> ${endDate}</li>
          <li><strong>Días solicitados:</strong> ${days}</li>
        </ul>
        <p>Esta solicitud requiere su validación final como RH.</p>
      `,
      approved: `
        <h2>Solicitud de Vacaciones Aprobada</h2>
        <p>¡Buenas noticias! Tu solicitud de vacaciones ha sido aprobada.</p>
        <ul>
          <li><strong>Fecha de inicio:</strong> ${startDate}</li>
          <li><strong>Fecha de fin:</strong> ${endDate}</li>
          <li><strong>Días aprobados:</strong> ${days}</li>
        </ul>
        <p>¡Disfruta tu descanso!</p>
      `,
      rejected: `
        <h2>Solicitud de Vacaciones Rechazada</h2>
        <p>Lamentablemente, tu solicitud de vacaciones ha sido rechazada.</p>
        <ul>
          <li><strong>Fecha de inicio:</strong> ${startDate}</li>
          <li><strong>Fecha de fin:</strong> ${endDate}</li>
          <li><strong>Días solicitados:</strong> ${days}</li>
        </ul>
        <p>Por favor contacta a tu supervisor o RH para más información.</p>
      `,
    };

    return this.sendEmail({
      to,
      subject: subjects[requestType],
      html: this.wrapInTemplate(bodies[requestType]),
    });
  }

  async sendBirthdayNotification(
    to: string,
    employeeName: string,
    birthDate: string,
  ): Promise<EmailResult> {
    const html = `
      <h2>🎂 Cumpleaños Próximo</h2>
      <p><strong>${employeeName}</strong> cumple años el <strong>${birthDate}</strong>.</p>
      <p>¡No olvides felicitarle!</p>
    `;

    return this.sendEmail({
      to,
      subject: `🎂 Cumpleaños próximo: ${employeeName}`,
      html: this.wrapInTemplate(html),
    });
  }

  async sendAnniversaryNotification(
    to: string,
    employeeName: string,
    years: number,
    date: string,
  ): Promise<EmailResult> {
    const html = `
      <h2>🎉 Aniversario Laboral</h2>
      <p><strong>${employeeName}</strong> cumple <strong>${years} año${years > 1 ? 's' : ''}</strong> en la empresa el <strong>${date}</strong>.</p>
      <p>¡Es un buen momento para reconocer su dedicación!</p>
    `;

    return this.sendEmail({
      to,
      subject: `🎉 Aniversario laboral: ${employeeName} (${years} años)`,
      html: this.wrapInTemplate(html),
    });
  }

  async sendGenericNotification(
    to: string,
    subject: string,
    title: string,
    message: string,
  ): Promise<EmailResult> {
    const html = `
      <h2>${title}</h2>
      <p>${message}</p>
    `;

    return this.sendEmail({
      to,
      subject,
      html: this.wrapInTemplate(html),
    });
  }

  private wrapInTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h2 {
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
          }
          ul {
            background: #f9fafb;
            padding: 15px 30px;
            border-radius: 8px;
          }
          li {
            margin: 8px 0;
          }
          p {
            margin: 12px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        ${content}
        <div class="footer">
          <p>Este es un correo automático del Sistema de Nómina. Por favor no responda a este mensaje.</p>
        </div>
      </body>
      </html>
    `;
  }
}
