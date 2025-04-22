import sgMail from '@sendgrid/mail';

// Create a mock email service that logs instead of sending if no API key
class EmailService {
  private apiKeyAvailable: boolean;
  
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    this.apiKeyAvailable = !!apiKey;
    
    if (this.apiKeyAvailable) {
      sgMail.setApiKey(apiKey!);
    } else {
      console.warn('No SendGrid API key found. Emails will be logged but not sent.');
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    const msg = {
      to,
      from: process.env.FROM_EMAIL || 'noreply@disasterrecovery.app',
      subject,
      text,
      html: html || text,
    };

    try {
      if (this.apiKeyAvailable) {
        await sgMail.send(msg);
        console.log(`Email sent to ${to}`);
        return true;
      } else {
        // Log the email instead of sending
        console.log('MOCK EMAIL:');
        console.log(JSON.stringify(msg, null, 2));
        return true;
      }
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  async sendOrganizationInvite(email: string, organizationName: string, roleName: string, loginUrl: string) {
    const subject = `You've been added to ${organizationName}`;
    const text = `
      Hello,
      
      You have been added to ${organizationName} as a ${roleName}.
      
      You can log in to access your account at: ${loginUrl}
      
      If you believe this was sent in error, please disregard this email.
      
      Thank you,
      The Disaster Recovery Platform Team
    `;
    
    const html = `
      <h2>Welcome to ${organizationName}</h2>
      <p>You have been added to ${organizationName} as a <strong>${roleName}</strong>.</p>
      <p>You can log in to access your account at: <a href="${loginUrl}">${loginUrl}</a></p>
      <p>If you believe this was sent in error, please disregard this email.</p>
      <p>Thank you,<br>The Disaster Recovery Platform Team</p>
    `;
    
    return this.sendEmail(email, subject, text, html);
  }
}

export const emailService = new EmailService();