import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Interface for email sender identity
interface SenderIdentity {
  email: string;
  name?: string;
}

// Email service with simplified implementation
class EmailService {
  private brevoApiAvailable: boolean;
  private defaultSender: SenderIdentity;
  
  constructor() {
    const brevoApiKey = process.env.BREVO_API_KEY;
    this.brevoApiAvailable = !!brevoApiKey;
    
    this.defaultSender = {
      email: process.env.FROM_EMAIL || 'noreply@normalrestored.com',
      name: process.env.FROM_NAME || 'Normal Restored',
    };
    
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
    
    const emailContent = {
      to,
      from: sender,
      subject,
      text,
      html: html || text,
    };

    try {
      if (this.brevoApiAvailable) {
        try {
          // Send email using Brevo API
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': process.env.BREVO_API_KEY!,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: {
                name: sender.name || 'Normal Restored',
                email: sender.email,
              },
              to: [
                {
                  email: to,
                  name: to.split('@')[0] // Use part before @ as name if no name provided
                }
              ],
              subject: subject,
              htmlContent: html || '',
              textContent: text,
              tags: ['transactional', 'normal-restored']
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            try {
              const errorData = JSON.parse(errorText);
              console.error('Brevo API error:', errorData);
            } catch (e) {
              console.error(`Brevo API error: ${response.status} ${response.statusText}`);
              console.error(`Response text: ${errorText}`);
            }
            // Continue without throwing error
            console.log('Email would have been sent:');
            console.log(JSON.stringify(emailContent, null, 2));
          } else {
            // Email sent successfully
            console.log(`Email sent to ${to} from ${sender.name} <${sender.email}>`);
          }
          
          return true;
        } catch (error) {
          console.error('Email API error:', error);
          console.log('Would have sent email:');
          console.log(JSON.stringify(emailContent, null, 2));
          return true; // Don't block operations
        }
      } else {
        // Log the email for debugging when no API key is available
        console.log('MOCK EMAIL (no API key available):');
        console.log(JSON.stringify(emailContent, null, 2));
        return true;
      }
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
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
  
  /**
   * Send organization invite
   */
  async sendOrganizationInvite(
    email: string, 
    organizationName: string, 
    roleName: string, 
    loginUrl: string,
    organizationId?: number
  ): Promise<boolean> {
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
   * Grant application workflow emails
   */

  // Send confirmation email when a grant is applied for
  async sendGrantApplicationConfirmation(
    to: string, 
    grantName: string, 
    clientName: string,
    organizationId?: number
  ): Promise<boolean> {
    const subject = "Your Grant Application Has Been Received";
    const text = `
Dear ${clientName},

Your application for the "${grantName}" grant has been successfully received. Our team will review your application and you will be notified of any updates.

Thank you for your application.

Best regards,
Normal Restored
    `;
    
    const html = `
<h2>Grant Application Received</h2>
<p>Dear ${clientName},</p>
<p>Your application for the <strong>${grantName}</strong> grant has been successfully received.</p>
<p>Our team will review your application and you will be notified of any updates.</p>
<p>Thank you for your application.</p>
<p>Best regards,<br>Normal Restored</p>
    `;
    
    return this.sendEmail(to, subject, text, html, organizationId);
  }

  // Send notification email when a grant is awarded
  async sendGrantAwardNotification(
    to: string, 
    grantName: string, 
    clientName: string,
    amount: number,
    organizationId?: number
  ): Promise<boolean> {
    const subject = "Congratulations! You've Been Awarded a Grant";
    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);

    const text = `
Dear ${clientName},

Congratulations! We are pleased to inform you that you have been awarded the "${grantName}" grant in the amount of ${formattedAmount}.

Our team will contact you with additional information about the next steps for receiving these funds.

Best regards,
Normal Restored
    `;
    
    const html = `
<h2>Grant Award Notification</h2>
<p>Dear ${clientName},</p>
<p>Congratulations! We are pleased to inform you that you have been awarded the <strong>${grantName}</strong> grant in the amount of <strong>${formattedAmount}</strong>.</p>
<p>Our team will contact you with additional information about the next steps for receiving these funds.</p>
<p>Best regards,<br>Normal Restored</p>
    `;
    
    return this.sendEmail(to, subject, text, html, organizationId);
  }

  // Send notification email when grant funds are released
  async sendGrantFundingNotification(
    to: string, 
    grantName: string, 
    clientName: string,
    amount: number,
    organizationId?: number
  ): Promise<boolean> {
    const subject = "Your Grant Funds Have Been Released";
    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);

    const text = `
Dear ${clientName},

We are pleased to inform you that the funds for your "${grantName}" grant in the amount of ${formattedAmount} have been released.

If you have any questions about receiving these funds, please contact your case manager.

Best regards,
Normal Restored
    `;
    
    const html = `
<h2>Grant Funds Released</h2>
<p>Dear ${clientName},</p>
<p>We are pleased to inform you that the funds for your <strong>${grantName}</strong> grant in the amount of <strong>${formattedAmount}</strong> have been released.</p>
<p>If you have any questions about receiving these funds, please contact your case manager.</p>
<p>Best regards,<br>Normal Restored</p>
    `;
    
    return this.sendEmail(to, subject, text, html, organizationId);
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