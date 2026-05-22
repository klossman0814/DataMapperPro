import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log(`SMTP transport configured for ${host}`);
    } else {
      this.logger.warn('SMTP_HOST not set — emails will be logged only');
    }
  }

  async sendResetEmail(to: string, token: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#1e293b;">DataMapper Pro — Password Reset</h2>
        <p style="color:#475569;">Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;">Or copy this link into your browser:<br>${resetLink}</p>
        <p style="color:#94a3b8;font-size:12px;">If you did not request this reset, you can safely ignore this email.</p>
      </div>
    `;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@datamapperpro.com',
        to,
        subject: 'DataMapper Pro — Password Reset',
        html,
      });
      this.logger.log(`Reset email sent to ${to}`);
    } else {
      this.logger.log(`[EMAIL LOG] To: ${to} — Reset link: ${resetLink}`);
    }
  }
}
