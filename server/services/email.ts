import sgMail from '@sendgrid/mail';
import { storage } from '../storage';

// Create a mock email service that logs instead of sending if no API key
// Enhanced to support organization-specific email settings
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

  /**
   * Get the sender email information based on organization settings
   * Falls back to system default if no organization or if org has no email config
   */
  private async getSenderInfo(organizationId?: number) {
    // Default sender info
    let senderEmail = process.env.FROM_EMAIL || 'noreply@normalrestored.com';
    let senderName = 'Normal Restored';
    
    if (organizationId) {
      try {
        const organization = await storage.getOrganization(organizationId);
        
        if (organization && organization.emailDomainVerified && organization.emailDomain) {
          // If organization has verified email domain, use that
          if (organization.emailSenderAddress) {
            // Use specific sender address if set
            senderEmail = organization.emailSenderAddress;
          } else {
            // Otherwise construct a default noreply@ address with their domain
            senderEmail = `noreply@${organization.emailDomain}`;
          }
          
          // Use custom sender name if available
          if (organization.emailSenderName) {
            senderName = organization.emailSenderName;
          } else {
            senderName = organization.name;
          }
        }
      } catch (error) {
        console.error('Error fetching organization email settings:', error);
        // Fall back to defaults if there's an error
      }
    }
    
    // Format the sender with name and email
    return `${senderName} <${senderEmail}>`;
  }

  /**
   * Send an email with optional organization context
   */
  async sendEmail(to: string, subject: string, text: string, html?: string, organizationId?: number) {
    // Get the appropriate sender based on organization settings
    const from = await this.getSenderInfo(organizationId);
    
    const msg = {
      to,
      from,
      subject,
      text,
      html: html || text,
    };

    try {
      if (this.apiKeyAvailable) {
        await sgMail.send(msg);
        console.log(`Email sent to ${to} from ${from}`);
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

  async sendOrganizationInvite(email: string, organizationName: string, roleName: string, loginUrl: string, organizationId?: number) {
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
    
    // Pass the organization ID to use the organization's email settings if available
    return this.sendEmail(email, subject, text, html, organizationId);
  }
}

export const emailService = new EmailService();