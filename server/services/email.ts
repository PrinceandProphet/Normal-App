import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Interface for email sender identity
interface SenderIdentity {
  email: string;
  name?: string;
}

// Create a mock email service that logs instead of sending if no API key
class EmailService {
  private apiKeyAvailable: boolean;
  private defaultSender: SenderIdentity;
  
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    this.apiKeyAvailable = !!apiKey;
    
    this.defaultSender = {
      email: process.env.FROM_EMAIL || 'noreply@disasterrecovery.app',
      name: process.env.FROM_NAME || 'Disaster Recovery Platform',
    };
    
    if (this.apiKeyAvailable) {
      sgMail.setApiKey(apiKey!);
    } else {
      console.warn('No SendGrid API key found. Emails will be logged but not sent.');
    }
  }

  /**
   * Get the sender identity for a specific organization
   * Falls back to the default sender if the organization doesn't have verified email settings
   */
  private async getOrganizationSender(organizationId?: number): Promise<SenderIdentity> {
    if (!organizationId) {
      return this.defaultSender;
    }

    try {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      
      // If the organization has verified email domain and sender settings, use those
      if (org?.emailDomainVerified && org?.emailSenderEmail && org?.emailSenderName) {
        return {
          email: org.emailSenderEmail,
          name: org.emailSenderName,
        };
      }
      
      // Otherwise, fall back to the system default
      return this.defaultSender;
    } catch (error) {
      console.error('Error fetching organization email settings:', error);
      return this.defaultSender;
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string, organizationId?: number) {
    // Get sender identity (either organization-specific or default)
    const sender = await this.getOrganizationSender(organizationId);
    
    const msg = {
      to,
      from: sender,
      subject,
      text,
      html: html || text,
    };

    try {
      if (this.apiKeyAvailable) {
        await sgMail.send(msg);
        console.log(`Email sent to ${to} from ${sender.email}`);
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

  async sendOrganizationInvite(
    email: string, 
    organizationName: string, 
    roleName: string, 
    loginUrl: string,
    organizationId?: number
  ) {
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
    
    return this.sendEmail(email, subject, text, html, organizationId);
  }

  /**
   * Verify an organization's domain by validating DNS records
   * In a real implementation, this would check SPF, DKIM, and DMARC records
   * For this demo, we'll simulate success
   */
  async verifyDomain(domainName: string, organizationId: number): Promise<{
    success: boolean;
    spfValid?: boolean;
    dkimValid?: boolean;
    dmarcValid?: boolean;
  }> {
    console.log(`Simulating domain verification for ${domainName}`);
    
    // In a real implementation, we would check DNS records
    // For now, we'll simulate success for demonstration purposes
    
    // Randomly succeed or fail to simulate real-world conditions (with 70% success rate)
    const spfValid = Math.random() > 0.3;
    const dkimValid = Math.random() > 0.3;
    const dmarcValid = Math.random() > 0.3;
    
    const success = spfValid && dkimValid;
    
    // If successful, update the organization record
    if (success) {
      try {
        await db.update(organizations)
          .set({ 
            emailDomainVerified: true,
            emailSpfRecord: `v=spf1 include:sendgrid.net ~all`,
            emailDkimSelector: 'em',
            emailDkimKey: 'simulated-dkim-key-value'
          })
          .where(eq(organizations.id, organizationId));
      } catch (error) {
        console.error('Error updating organization domain verification status:', error);
        return { success: false };
      }
    }
    
    return {
      success,
      spfValid,
      dkimValid,
      dmarcValid
    };
  }

  /**
   * Generate DNS records that need to be added for domain verification
   */
  getDomainVerificationRecords(domain: string): {
    spfRecord: string;
    dkimRecord: string;
    dmarcRecord: string;
  } {
    return {
      spfRecord: `v=spf1 include:sendgrid.net ~all`,
      dkimRecord: `em._domainkey.${domain}. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXvW9fJQkmcbewKgYd5yN/tGG48HNe2qqhyQ8sJ/OlrGf6qcfiCVOX3UR6/sjsEuL/r+CrjGsVv8bjN8LYRWqeU5i4Z8wWYBT3vvkMh/qpz+7RJe2EepaIEGZm21a6SRwYLN7If7KI39/XP4fLYY7vGKywG7PZpKfKI/6iJJSDaQIDAQAB"`,
      dmarcRecord: `_dmarc.${domain}. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@${domain}; aspf=r; adkim=r; fo=1:d:s"`
    };
  }
}

export const emailService = new EmailService();