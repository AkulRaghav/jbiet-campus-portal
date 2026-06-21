import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailService {
  send(options: EmailOptions): Promise<void>;
}

// Production SMTP email service
class SmtpEmailService implements EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(options: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@jbiet.edu.in',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}

// Development mock email service (logs to console)
class MockEmailService implements EmailService {
  async send(options: EmailOptions): Promise<void> {
    console.log('═══════════════════════════════════════════');
    console.log('📧 MOCK EMAIL SENT');
    console.log('───────────────────────────────────────────');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text || options.html}`);
    console.log('═══════════════════════════════════════════');
  }
}

// Factory - use SMTP in production, mock in development
function createEmailService(): EmailService {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return new SmtpEmailService();
  }
  return new MockEmailService();
}

export const emailService = createEmailService();

// Template: Send auto-generated password to new user
export async function sendWelcomeEmail(email: string, username: string, password: string, role: string): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1f4e5f; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">JBIET Students Examination Portal</h1>
        <p style="color: #e5a100; margin: 5px 0 0 0;">JB Institute of Engineering & Technology</p>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f4e5f;">Welcome to the Portal!</h2>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${role}</p>
        </div>
        <p style="color: #dc2626; margin-top: 15px;"><strong>⚠️ You must change your password on first login.</strong></p>
        <p>Login at: <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login</a></p>
      </div>
      <div style="background: #1f4e5f; padding: 15px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">This is an automated message. Do not reply.</p>
      </div>
    </div>
  `;

  const text = `JBIET Portal - Account Created\n\nUsername: ${username}\nTemporary Password: ${password}\nRole: ${role}\n\nYou must change your password on first login.\nLogin at: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

  await emailService.send({
    to: email,
    subject: 'JBIET Portal - Your Account Has Been Created',
    html,
    text,
  });
}
