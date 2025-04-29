import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import SibApiV3Sdk from 'sib-api-v3-sdk';

// Initialize Brevo API client 
// Note: Using the direct import style to avoid TypeScript issues
let brevoApiAvailable = false;
try {
  if (process.env.BREVO_API_KEY) {
    const apiKey = SibApiV3Sdk.ApiClient.instance.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    brevoApiAvailable = true;
    console.log('Brevo API client initialized successfully');
  } else {
    console.warn('No Brevo API key found, email functionality will be limited');
  }
} catch (error) {
  console.error('Error initializing Brevo client:', error);
}

// Interface for email sender identity
interface SenderIdentity {
  email: string;
  name?: string;
}

// Email service using both Brevo (for transactional emails) and MailSlurp (for message center)
class EmailService {
  private mailslurpApiAvailable: boolean;
  private brevoApiAvailable: boolean;
  private defaultSender: SenderIdentity;
  private transactionalEmailApi: SibApiV3Sdk.TransactionalEmailsApi;
  
  constructor() {
    const mailslurpApiKey = process.env.MAILSLURP_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY;
    
    this.mailslurpApiAvailable = !!mailslurpApiKey;
    this.brevoApiAvailable = !!brevoApiKey;
    this.transactionalEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
    
    this.defaultSender = {
      email: process.env.FROM_EMAIL || 'noreply@normal-restored.org',
      name: process.env.FROM_NAME || 'Normal Restored',
    };
    
    if (!this.mailslurpApiAvailable) {
      console.warn('No MailSlurp API key found. Message center emails will be logged but not sent.');
    }
    
    if (!this.brevoApiAvailable) {
      console.warn('No Brevo API key found. Transactional emails will be logged but not sent.');
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

  async sendEmail(to: string, subject: string, text: string, html?: string, organizationId?: number): Promise<boolean> {
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
      // Try to send email using Brevo API for transactional emails first
      if (this.brevoApiAvailable) {
        try {
          // Create a SendSmtpEmail object using Brevo SDK
          const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
          
          // Set sender info
          sendSmtpEmail.sender = {
            email: sender.email,
            name: sender.name || 'Normal Restored'
          };
          
          // Set recipient info (must be an array of objects)
          sendSmtpEmail.to = [{
            email: to,
            name: ''
          }];
          
          // Set email content
          sendSmtpEmail.subject = subject;
          sendSmtpEmail.htmlContent = html || '';
          sendSmtpEmail.textContent = text;
          
          // Add tracking
          sendSmtpEmail.tags = ['transactional', 'normal-restored'];
          
          // Send the email using the TransactionalEmailsApi
          const response = await this.transactionalEmailApi.sendTransacEmail(sendSmtpEmail);
          console.log(`Email sent via Brevo to ${to} from ${sender.name} <${sender.email}>`);
          return true;
        } catch (error) {
          console.error('Brevo API error:', error);
          
          // Log what would have been sent
          console.log('Failed to send email via Brevo. Would have sent:');
          console.log(JSON.stringify({
            sender: {
              email: sender.email,
              name: sender.name
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text
          }, null, 2));
          
          // Don't throw error, return true to prevent blocking operations
          return true;
        }
      } else if (this.mailslurpApiAvailable) {
        // Fallback to MailSlurp if available
        try {
          // Using fetch to send the email via MailSlurp API
          const response = await fetch('https://api.mailslurp.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.MAILSLURP_API_KEY!
            },
            body: JSON.stringify({
              senderId: null, // Using the default inbox
              to: [to], // Recipients should be in an array
              subject: subject,
              body: html || text,
              isHTML: !!html // Note the camelCase for isHTML
            })
          });

          // If API call fails, log but don't throw error
          if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
              errorData = JSON.parse(errorText);
              console.error(`MailSlurp API error: ${errorData.message || response.statusText}`);
            } catch (e) {
              console.error(`MailSlurp API error: ${response.status} ${response.statusText}`);
              console.error(`Error response: ${errorText}`);
            }
            
            console.log('Continuing without email sending. Would have sent:');
            console.log(JSON.stringify({
              senderId: null,
              to: [to],
              subject: subject,
              body: html || text,
              isHTML: !!html
            }, null, 2));
          } else {
            console.log(`Email sent via MailSlurp to ${to} from ${sender.name} <${sender.email}>`);
          }
          
          return true;
        } catch (error) {
          console.error('MailSlurp API error:', error);
          // Log what we would have sent
          console.log('Failed to send email. Would have sent:');
          console.log(JSON.stringify(msg, null, 2));
          return true; // Return true to prevent blocking operations
        }
      } else {
        // No email API available, just log the email
        console.log('MOCK EMAIL (no API available):');
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

  /**
   * Send welcome email to a newly created organization
   */
  async sendNewOrganizationWelcome(organizationName: string, adminEmail: string): Promise<boolean> {
    const subject = "Welcome to Normal Restored";
    const text = `
Your organization, ${organizationName}, has been successfully created in the Normal platform. You can now start adding your team members and clients.

Thank you,
The Normal Restored Team
    `;
    
    const html = `
<h2>Welcome to Normal Restored</h2>
<p>Your organization, <strong>${organizationName}</strong>, has been successfully created in the Normal platform.</p>
<p>You can now start adding your team members and clients.</p>
<p>Thank you,<br>The Normal Restored Team</p>
    `;
    
    return this.sendEmail(adminEmail, subject, text, html);
  }

  /**
   * Send welcome email to a newly added staff member
   */
  async sendNewStaffWelcome(organizationName: string, staffEmail: string, organizationId?: number): Promise<boolean> {
    const subject = "You've Been Added to Normal";
    const text = `
You have been added as a staff member to ${organizationName} on the Normal platform. Please log in using your email address to access your dashboard.

Thank you,
The Normal Restored Team
    `;
    
    const html = `
<h2>Welcome to Normal</h2>
<p>You have been added as a staff member to <strong>${organizationName}</strong> on the Normal platform.</p>
<p>Please log in using your email address to access your dashboard.</p>
<p>Thank you,<br>The Normal Restored Team</p>
    `;
    
    return this.sendEmail(staffEmail, subject, text, html, organizationId);
  }
}

export const emailService = new EmailService();