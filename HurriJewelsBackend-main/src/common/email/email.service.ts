import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private isInitialized = false;
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');
    
    // Skip initialization if credentials are not provided
    if (!smtpUser || !smtpPass) {
      this.logger.warn('SMTP credentials not provided. Email functionality will be disabled.');
      return;
    }

    // Try multiple SMTP configurations for better compatibility
    const smtpConfigs = [
      // Configuration 1: Gmail with port 587 (TLS)
      {
        host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        tls: { rejectUnauthorized: false },
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        rateDelta: 20000,
        rateLimit: 5
      },
      // Configuration 2: Gmail with port 465 (SSL)
      {
        host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        tls: { rejectUnauthorized: false },
        pool: true,
        maxConnections: 1,
        maxMessages: 100,
        rateDelta: 20000,
        rateLimit: 5
      }
    ];

    for (let i = 0; i < smtpConfigs.length; i++) {
      try {
        this.logger.log(`Trying SMTP configuration ${i + 1}: ${smtpConfigs[i].host}:${smtpConfigs[i].port} (${smtpConfigs[i].secure ? 'SSL' : 'TLS'})`);
        
        this.transporter = nodemailer.createTransport(smtpConfigs[i]);
        
        // Test the connection with retry logic
        await this.testConnection();
        
        this.logger.log(`✅ SMTP server is ready with configuration ${i + 1}`);
        this.isInitialized = true;
        return;
        
      } catch (error) {
        this.logger.warn(`SMTP configuration ${i + 1} failed:`, {
          message: error.message,
          code: (error as any).code,
          command: (error as any).command
        });
        
        if (i === smtpConfigs.length - 1) {
          this.logger.error('All SMTP configurations failed. Email functionality will be disabled.');
          this.logger.warn('SMTP Troubleshooting Tips:');
          this.logger.warn('1. Check if SMTP_USER and SMTP_PASS are correctly set in .env');
          this.logger.warn('2. For Gmail, use App Password instead of regular password');
          this.logger.warn('3. Ensure 2-Factor Authentication is enabled for Gmail');
          this.logger.warn('4. Check if your network allows SMTP connections');
          this.logger.warn('5. Try using port 465 with secure: true for Gmail');
          this.logger.warn('6. Check if your firewall is blocking SMTP ports');
        }
      }
    }
  }

  private async testConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.transporter.verify((error, success) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    // Skip email sending if SMTP is not initialized
    if (!this.isInitialized) {
      this.logger.warn(`📧 [EMAIL DISABLED] Email would be sent to: ${to}`);
      this.logger.warn(`📧 [EMAIL DISABLED] Subject: ${subject}`);
      this.logger.warn(`📧 [EMAIL DISABLED] To enable email sending, configure SMTP settings in .env`);
      return;
    }

    // Skip email sending in development mode if SMTP is not configured
    if (process.env.NODE_ENV === 'development' && !this.configService.get('SMTP_USER')) {
      this.logger.warn(`📧 [DEV MODE] Email would be sent to: ${to}`);
      this.logger.warn(`📧 [DEV MODE] Subject: ${subject}`);
      this.logger.warn(`📧 [DEV MODE] To enable real email sending, configure SMTP settings in .env`);
      return;
    }

    try {
      const mailOptions = {
        from: this.configService.get('SMTP_FROM'),
        to,
        subject,
        html,
        text,
      };

      this.logger.log(`Attempting to send email to: ${to}, from: ${mailOptions.from}`);
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, {
        message: error.message,
        code: (error as any).code,
        response: (error as any).response,
        stack: error.stack
      });
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const subject = 'Welcome to HurriJewels!';
    const html = `
      <h1>Welcome to HurriJewels, ${firstName}!</h1>
      <p>Thank you for joining our jewelry platform. We're excited to have you on board!</p>
      <p>Start exploring our beautiful collection of jewelry today.</p>
    `;
    const text = `Welcome to HurriJewels, ${firstName}! Thank you for joining our jewelry platform.`;

    await this.sendEmail(to, subject, html, text);
  }

  async sendPasswordResetEmail(to: string, resetToken: string, fullName?: string): Promise<void> {
    const subject = 'Reset Your Password - HurriJewels';
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const displayName = fullName || 'Valued Customer';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
        <p>Hi ${displayName},</p>
        <p>We received a request to reset your password for your HurriJewels account. If you made this request, click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">© 2024 HurriJewels. All rights reserved.</p>
      </div>
    `;
    const text = `Password Reset Request - Hi ${displayName}, please reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`;

    await this.sendEmail(to, subject, html, text);
  }

  async sendOrderConfirmationEmail(to: string, firstName: string, orderNumber: string): Promise<void> {
    const subject = `Order Confirmation - ${orderNumber}`;
    const html = `
      <h1>Order Confirmed!</h1>
      <p>Hi ${firstName},</p>
      <p>Your order ${orderNumber} has been confirmed and is being processed.</p>
      <p>We'll send you updates as your order progresses.</p>
      <p>Thank you for choosing HurriJewels!</p>
    `;
    const text = `Order Confirmed! Hi ${firstName}, Your order ${orderNumber} has been confirmed.`;

    await this.sendEmail(to, subject, html, text);
  }

  async sendVendorApprovalEmail(to: string, businessName: string, approved: boolean): Promise<void> {
    const subject = approved ? 'Vendor Account Approved' : 'Vendor Account Update';
    const html = `
      <h1>${approved ? 'Congratulations!' : 'Account Update'}</h1>
      <p>Your vendor account for ${businessName} has been ${approved ? 'approved' : 'reviewed'}.</p>
      ${approved ? '<p>You can now start listing your products on our platform.</p>' : '<p>Please check your account for more details.</p>'}
    `;
    const text = `Your vendor account for ${businessName} has been ${approved ? 'approved' : 'reviewed'}.`;

    await this.sendEmail(to, subject, html, text);
  }

  async sendEmailVerificationEmail(to: string, fullName: string, verificationToken: string): Promise<void> {
    const subject = 'Verify Your Email - HurriJewels';
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to HurriJewels!</h1>
        <p>Hi ${fullName},</p>
        <p>Thank you for creating an account with HurriJewels. To complete your registration and start exploring our beautiful jewelry collection, please verify your email address.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account with HurriJewels, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px; text-align: center;">© 2024 HurriJewels. All rights reserved.</p>
      </div>
    `;
    const text = `Welcome to HurriJewels! Hi ${fullName}, please verify your email by visiting: ${verificationUrl}`;

    await this.sendEmail(to, subject, html, text);
  }

  // Method to test email configuration
  async testEmailConfiguration(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isInitialized) {
        return {
          success: false,
          message: 'SMTP not initialized. Please check your SMTP configuration in .env file.'
        };
      }

      await this.testConnection();
      return {
        success: true,
        message: 'SMTP configuration is working correctly.'
      };
    } catch (error) {
      return {
        success: false,
        message: `SMTP test failed: ${error.message}`
      };
    }
  }
}