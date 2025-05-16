import { db } from '../db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { getEnvironment, isDevelopment, isProduction, isStaging } from '../config';
import { promises as fs } from 'fs';
import path from 'path';
import { captureException, captureMessage } from '../sentry';

// Interface for email sender identity
interface SenderIdentity {
  email: string;
  name?: string;
}

// Interface for email error details
interface EmailError {
  timestamp: string;
  errorType: string;
  message: string;
  code?: string;
  details?: any;
  request?: any;
  recipient?: string;
  stack?: string;
}

// Email service with simplified implementation
class EmailService {
  private brevoApiAvailable: boolean;
  private defaultSender: SenderIdentity;
  private logDirectory: string = 'logs';
  
  /**
   * Log email errors to a file in development mode
   * @param error The error details to log
   */
  private async logEmailError(error: EmailError): Promise<void> {
    if (isDevelopment()) {
      try {
        // Create logs directory if it doesn't exist
        try {
          await fs.mkdir(this.logDirectory, { recursive: true });
        } catch (e) {
          // Directory might already exist, ignore this error
        }
        
        // Create a log filename based on date
        const date = new Date();
        const logFilename = `email-errors-${date.getFullYear()}-${
          date.getMonth() + 1
        }-${date.getDate()}.log`;
        
        // Format the error as JSON with proper indentation
        const errorLog = JSON.stringify(error, null, 2);
        
        // Append to the log file
        await fs.appendFile(
          path.join(this.logDirectory, logFilename),
          `\n${errorLog}\n${'-'.repeat(80)}\n`,
          'utf8'
        );
        
        console.log(`📧 Error details logged to ${path.join(this.logDirectory, logFilename)}`);
      } catch (err) {
        console.error('❌ Failed to write to email error log:', err);
      }
    }
  }
  
  constructor() {
    console.log('\n📧 === EMAIL SERVICE INITIALIZATION ===');
    
    const environment = getEnvironment();
    console.log(`📧 Initializing email service in ${environment} environment`);
    
    const brevoApiKey = process.env.BREVO_API_KEY;
    this.brevoApiAvailable = !!brevoApiKey;
    
    if (this.brevoApiAvailable) {
      console.log('✅ Brevo API key found in environment variables');
      console.log(`✅ API key length: ${brevoApiKey!.length} characters`);
      
      // Check for suspicious API key formats
      if (brevoApiKey!.length < 30) {
        const warning = '❗ WARNING: Brevo API key seems unusually short. Verify it is correct.';
        console.warn(warning);
        
        if (isProduction() || isStaging()) {
          captureMessage(warning, 'warning', {
            context: 'EmailService',
            keyLength: brevoApiKey!.length
          });
        }
      }
      
      // Log first and last 4 characters for verification without exposing the full key
      const firstFour = brevoApiKey!.substring(0, 4);
      const lastFour = brevoApiKey!.substring(brevoApiKey!.length - 4);
      console.log(`✅ API key format check: ${firstFour}...${lastFour}`);
    } else {
      const warning = '⚠️ No Brevo API key found in environment variables. Emails will be logged but NOT sent.';
      console.warn(warning);
      console.warn('⚠️ Set BREVO_API_KEY in your .env file to enable email sending');
      
      if (isProduction() || isStaging()) {
        captureMessage(warning, 'warning', {
          context: 'EmailService',
          environment
        });
      }
    }
    
    // Configure default sender based on environment
    if (isDevelopment()) {
      // In development, use a test email address to prevent accidental sending to real users
      this.defaultSender = {
        email: process.env.DEV_EMAIL || 'dev-test@normalrestored.com',
        name: process.env.DEV_NAME || 'Normal Restored (Development)',
      };
      console.log('ℹ️ Development mode: Using development sender identity');
    } else {
      // In production/staging, use the configured sender or default
      this.defaultSender = {
        email: process.env.FROM_EMAIL || 'noreply@normalrestored.com',
        name: process.env.FROM_NAME || 'Normal Restored',
      };
    }
    
    console.log(`📧 Default sender: ${this.defaultSender.name} <${this.defaultSender.email}>`);
    
    if (isDevelopment()) {
      console.log('ℹ️ Development mode: Emails will be logged to console and files');
      console.log('ℹ️ Set DEV_EMAIL in .env to change the development sender email');
    } else if (isStaging()) {
      console.log('ℹ️ Staging mode: Emails will be sent using staging sender identity');
      console.log('ℹ️ Errors will be reported to Sentry if configured');
    } else if (isProduction()) {
      console.log('ℹ️ Production mode: Emails will be sent using production sender identity');
      console.log('ℹ️ Errors will be reported to Sentry if configured');
    }
    
    console.log('📧 === EMAIL SERVICE INITIALIZATION COMPLETED ===\n');
  }

  /**
   * Get the sender identity for a specific organization
   * Falls back to the default sender if the organization doesn't have verified email settings
   */
  private async getOrganizationSender(organizationId?: number): Promise<SenderIdentity> {
    console.log(`📧 Resolving sender identity for organizationId: ${organizationId || 'none'}`);
    
    if (!organizationId) {
      console.log(`📧 No organization ID provided, using default sender`);
      return this.defaultSender;
    }

    try {
      console.log(`📧 Looking up organization ${organizationId} in database`);
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      
      if (!org) {
        console.log(`❗ Organization ${organizationId} not found in database`);
        console.log(`📧 Falling back to default sender`);
        return this.defaultSender;
      }
      
      console.log(`📧 Found organization: ${org.name} (ID: ${org.id})`);
      console.log(`📧 Organization email settings:`);
      console.log(`📧 - Domain verified: ${org.emailDomainVerified ? 'Yes' : 'No'}`);
      console.log(`📧 - Sender email: ${org.emailSenderEmail || 'Not set'}`);
      console.log(`📧 - Sender name: ${org.emailSenderName || 'Not set'}`);
      
      // If the organization has verified email domain and sender settings, use those
      if (org.emailDomainVerified && org.emailSenderEmail && org.emailSenderName) {
        console.log(`✅ Using organization-specific sender: ${org.emailSenderName} <${org.emailSenderEmail}>`);
        return {
          email: org.emailSenderEmail,
          name: org.emailSenderName,
        };
      }
      
      // Log the specific reason for fallback
      if (!org.emailDomainVerified) {
        console.log(`❗ Organization domain not verified, cannot use custom sender`);
      } else if (!org.emailSenderEmail) {
        console.log(`❗ Organization sender email not configured`);
      } else if (!org.emailSenderName) {
        console.log(`❗ Organization sender name not configured`);
      }
      
      // Otherwise, fall back to the system default
      console.log(`📧 Falling back to default sender: ${this.defaultSender.name} <${this.defaultSender.email}>`);
      return this.defaultSender;
    } catch (error) {
      console.error('❌ Error fetching organization email settings:', error);
      if (error instanceof Error) {
        console.error(`❌ Error message: ${error.message}`);
        console.error(`❌ Error stack: ${error.stack}`);
      }
      console.log(`📧 Falling back to default sender due to error`);
      return this.defaultSender;
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string, organizationId?: number): Promise<boolean> {
    console.log('\n📧 === EMAIL DELIVERY ATTEMPT STARTED ===');
    console.log(`📧 Recipient: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    
    // Log origination context if any
    const stack = new Error().stack;
    if (stack) {
      const callerLine = stack.split('\n')[2];
      console.log(`📧 Called from: ${callerLine?.trim() || 'unknown'}`);
    }
    
    // Get sender identity (either organization-specific or default)
    console.log(`📧 Getting sender for organizationId: ${organizationId || 'default'}`);
    const sender = await this.getOrganizationSender(organizationId);
    console.log(`📧 Using sender: ${sender.name || 'No name'} <${sender.email}>`);
    
    const emailContent = {
      to,
      from: sender,
      subject,
      text,
      html: html || text,
    };

    try {
      if (this.brevoApiAvailable) {
        console.log('📧 Brevo API key is available, attempting to send email');
        
        // Prepare request payload
        const brevoPayload = {
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
        };
        
        console.log('📧 Brevo request payload:', JSON.stringify(brevoPayload, null, 2));
        
        try {
          // Record start time to measure API response time
          const startTime = Date.now();
          
          console.log('📧 Sending request to Brevo API...');
          
          // Send email using Brevo API
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': process.env.BREVO_API_KEY!,
              'content-type': 'application/json'
            },
            body: JSON.stringify(brevoPayload)
          });
          
          const responseTime = Date.now() - startTime;
          console.log(`📧 Brevo API response received in ${responseTime}ms`);
          console.log(`📧 Response status: ${response.status} ${response.statusText}`);

          if (!response.ok) {
            console.error('❌ EMAIL DELIVERY FAILED');
            const errorText = await response.text();
            console.log(`📧 Raw error response: ${errorText}`);
            
            // Create base error object
            const errorDetails: EmailError = {
              timestamp: new Date().toISOString(),
              errorType: 'API_RESPONSE_ERROR',
              message: `API returned status ${response.status} ${response.statusText}`,
              request: {
                url: 'https://api.brevo.com/v3/smtp/email',
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'content-type': 'application/json',
                  // Don't include the actual API key
                  'api-key': '[REDACTED]'
                },
                payload: brevoPayload
              },
              recipient: to
            };
            
            try {
              const errorData = JSON.parse(errorText);
              console.error('❌ Brevo API error details:', JSON.stringify(errorData, null, 2));
              
              // Add parsed error data to our error object
              errorDetails.code = errorData.code;
              errorDetails.details = errorData;
              
              // Check for specific error types
              if (errorData.code === 'unauthorized') {
                console.error('❌ Authentication error: API key may be invalid or IP not whitelisted');
                errorDetails.errorType = 'AUTHENTICATION_ERROR';
                
                if (errorData.message && errorData.message.includes('unrecognised IP address')) {
                  console.error('❌ IP ADDRESS NEEDS WHITELISTING in Brevo admin panel');
                  console.error('❌ Follow the link in the error message to whitelist your IP');
                  errorDetails.errorType = 'IP_WHITELIST_ERROR';
                }
              } else if (errorData.code === 'invalid_parameter') {
                console.error('❌ Invalid parameter error: Check sender email domain validity');
                errorDetails.errorType = 'PARAMETER_ERROR';
              } else if (errorData.code === 'not_enough_credits') {
                console.error('❌ Account has insufficient credits to send email');
                errorDetails.errorType = 'CREDITS_ERROR';
              } else if (errorData.code === 'domain_not_allowed') {
                console.error('❌ Domain not authorized: Verify sender domain in Brevo');
                errorDetails.errorType = 'DOMAIN_ERROR';
              }
              
              // Report to Sentry in production/staging
              if (isProduction() || isStaging()) {
                captureMessage(`Email delivery failed: ${errorDetails.errorType}`, 'error', {
                  context: 'EmailService',
                  errorDetails: {
                    code: errorData.code,
                    message: errorData.message,
                    type: errorDetails.errorType,
                    recipientDomain: to.split('@')[1],
                    senderDomain: sender.email.split('@')[1]
                  }
                });
              }
              
              // Log to file in development mode
              await this.logEmailError(errorDetails);
              
            } catch (e) {
              console.error(`❌ Brevo API error: ${response.status} ${response.statusText}`);
              console.error(`❌ Response is not valid JSON: ${errorText}`);
              
              // Update error details with parsing error
              errorDetails.errorType = 'INVALID_ERROR_RESPONSE';
              errorDetails.details = { rawText: errorText };
              
              if (e instanceof Error) {
                errorDetails.message = e.message;
                errorDetails.stack = e.stack;
              }
              
              // Report to Sentry in production/staging
              if (isProduction() || isStaging()) {
                captureException(e, {
                  context: 'EmailService',
                  data: {
                    statusCode: response.status,
                    statusText: response.statusText,
                    recipientDomain: to.split('@')[1],
                    senderDomain: sender.email.split('@')[1]
                  }
                });
              }
              
              // Log to file in development mode
              await this.logEmailError(errorDetails);
            }
            
            // Different behavior based on environment
            if (isDevelopment()) {
              // In development, log what would have been sent for debugging
              console.log('📧 Email would have been sent:');
              console.log(JSON.stringify(emailContent, null, 2));
              
              // Log entire HTTP request for debugging
              console.log('📧 Complete request details for troubleshooting:');
              console.log(`📧 URL: https://api.brevo.com/v3/smtp/email`);
              console.log(`📧 Method: POST`);
              console.log(`📧 Headers: accept: application/json, content-type: application/json, api-key: [REDACTED]`);
              console.log(`📧 Body: ${JSON.stringify(brevoPayload, null, 2)}`);
            } else {
              // In production/staging, keep logs minimal and structured
              console.error(`❌ Email delivery failed: ${errorDetails.errorType} - ${to}`);
            }
          } else {
            // Get the response body
            const responseData = await response.json();
            console.log('✅ EMAIL DELIVERY SUCCESSFUL');
            console.log(`📧 Message ID: ${responseData.messageId || 'not provided'}`);
            console.log(`📧 Email sent to ${to} from ${sender.name || 'No name'} <${sender.email}>`);
          }
          
          console.log('📧 === EMAIL DELIVERY ATTEMPT COMPLETED ===\n');
          return true;
        } catch (error) {
          console.error('❌ EMAIL DELIVERY FAILED - EXCEPTION THROWN');
          
          // Different logging based on environment
          if (isDevelopment()) {
            // Detailed debug logging in development
            console.error('❌ Detailed error during API request:', error);
          } else {
            // Minimal logging in production to avoid excessive log volume
            console.error('❌ Email sending error:', error instanceof Error ? error.message : String(error));
          }
          
          // Create error object for logging
          const errorDetails: EmailError = {
            timestamp: new Date().toISOString(),
            errorType: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : String(error),
            request: {
              url: 'https://api.brevo.com/v3/smtp/email',
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': '[REDACTED]'
              },
              payload: brevoPayload
            },
            recipient: to
          };
          
          // Add stack trace if available
          if (error instanceof Error) {
            errorDetails.stack = error.stack;
            
            // Check for specific error types
            if (error instanceof TypeError && error.message.includes('fetch')) {
              console.error('❌ Network error: Unable to connect to Brevo API');
              errorDetails.errorType = 'FETCH_NETWORK_ERROR';
              errorDetails.details = {
                suggestion: 'Check network connectivity, proxy settings, or firewall rules'
              };
              
              if (isDevelopment()) {
                console.error('❌ Check your internet connection or proxy settings');
              }
            } else if (error.message.includes('ENOTFOUND')) {
              console.error('❌ DNS resolution error: Cannot resolve Brevo API hostname');
              errorDetails.errorType = 'DNS_RESOLUTION_ERROR';
              errorDetails.details = {
                suggestion: 'Check DNS settings or internet connectivity'
              };
            } else if (error.message.includes('ECONNREFUSED')) {
              console.error('❌ Connection refused: The Brevo API server refused the connection');
              errorDetails.errorType = 'CONNECTION_REFUSED';
              errorDetails.details = {
                suggestion: 'Check if outbound connections to api.brevo.com are allowed by firewall'
              };
            } else if (error.message.includes('ETIMEDOUT')) {
              console.error('❌ Connection timed out: The Brevo API server did not respond in time');
              errorDetails.errorType = 'CONNECTION_TIMEOUT';
              errorDetails.details = {
                suggestion: 'Check network latency or increase the request timeout'
              };
            } else if (error.message.includes('certificate')) {
              console.error('❌ SSL/TLS error: Issue with the Brevo API server certificate');
              errorDetails.errorType = 'SSL_CERTIFICATE_ERROR';
              errorDetails.details = {
                suggestion: 'Check SSL/TLS configuration, certificates, or proxy settings'
              };
            }
            
            // Report to Sentry in production/staging
            if (isProduction() || isStaging()) {
              captureException(error, {
                context: 'EmailService',
                data: {
                  errorType: errorDetails.errorType,
                  recipient: to,
                  recipientDomain: to.split('@')[1],
                  senderDomain: sender.email.split('@')[1]
                }
              });
            }
          }
          
          // Additional environment-specific information
          if (isDevelopment()) {
            console.log(`📧 Current environment: ${getEnvironment()}`);
            errorDetails.details = {
              ...errorDetails.details,
              environment: getEnvironment(),
              nodeVersion: process.version,
              platform: process.platform
            };
            
            // In development, show the email that would have been sent
            console.log('📧 Would have sent email:');
            console.log(JSON.stringify(emailContent, null, 2));
          }
          
          // Log error to file in development
          if (isDevelopment()) {
            await this.logEmailError(errorDetails);
          }
          
          console.log('📧 === EMAIL DELIVERY ATTEMPT COMPLETED WITH ERRORS ===\n');
          
          // In development, provide troubleshooting suggestions
          if (isDevelopment()) {
            console.log('📧 Troubleshooting suggestions:');
            console.log('1. Verify your Brevo API key is correct');
            console.log('2. Check if your server IP address is whitelisted in Brevo');
            console.log('3. Ensure your sender domain is authorized in Brevo');
            console.log('4. Check network connectivity and firewall rules');
            console.log('5. View detailed logs in the logs directory');
            
            // In development, allow operations to continue
            return true;
          } else {
            // In production, fail appropriately based on the error type
            // For critical sending errors that might require manual intervention, return false
            return false;
          }
        }
      } else {
        // Different behavior when API key is not available based on environment
        if (isDevelopment()) {
          // In development, log the email for debugging when no API key is available
          console.log('📧 MOCK EMAIL (no API key available in development):');
          console.log(JSON.stringify(emailContent, null, 2));
          console.log('❗ Check your .env file - BREVO_API_KEY is not set');
          console.log('📧 === EMAIL DELIVERY MOCK COMPLETED (DEVELOPMENT MODE) ===\n');
          return true; // Allow operations to continue in development
        } else if (isStaging()) {
          // In staging, log warning but allow operations to continue for testing
          console.warn('⚠️ EMAIL NOT SENT: No Brevo API key available in staging environment');
          // Report to Sentry for monitoring
          captureMessage('Email not sent: Missing API key in staging', 'warning', {
            context: 'EmailService',
            data: {
              recipient: to,
              subject: subject
            }
          });
          return true; // Allow staging tests to continue
        } else {
          // In production, this is a critical error
          console.error('❌ CRITICAL ERROR: No Brevo API key available in production environment');
          // Report to Sentry
          captureMessage('Critical: Email not sent due to missing API key in production', 'error', {
            context: 'EmailService',
            data: {
              recipient: to,
              subject: subject
            }
          });
          return false; // Should fail in production to alert operators
        }
      }
    } catch (error) {
      console.error('❌ CRITICAL EMAIL SENDING ERROR');
      
      // Different logging behavior based on environment
      if (isDevelopment()) {
        // Detailed logging in development
        console.error('❌ Detailed unexpected error in email sending function:', error);
        if (error instanceof Error && error.stack) {
          console.error('❌ Stack trace:', error.stack);
        }
      } else {
        // Concise logging in production
        console.error('❌ Email critical error:', error instanceof Error ? error.message : String(error));
      }
      
      // Create an error object for logging
      const errorDetails: EmailError = {
        timestamp: new Date().toISOString(),
        errorType: 'CRITICAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        recipient: to
      };
      
      // Add stack trace if available
      if (error instanceof Error) {
        errorDetails.stack = error.stack;
        
        // Try to classify the error
        if (error.message.includes('database') || error.message.includes('sql') || error.message.includes('query')) {
          errorDetails.errorType = 'DATABASE_ERROR';
          console.error('❌ Database related error detected');
        } else if (error.message.includes('memory') || error.message.includes('heap')) {
          errorDetails.errorType = 'MEMORY_ERROR';
          console.error('❌ Memory allocation error detected');
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorDetails.errorType = 'TIMEOUT_ERROR';
          console.error('❌ Timeout error detected');
        }
        
        // Send error to Sentry in production/staging
        if (isProduction() || isStaging()) {
          captureException(error, {
            context: 'EmailService',
            data: {
              errorType: errorDetails.errorType,
              recipient: to,
              subject: subject,
              organizationId
            }
          });
        }
      }
      
      // Add environment context in development mode
      if (isDevelopment()) {
        errorDetails.details = {
          environment: getEnvironment(),
          nodeVersion: process.version,
          platform: process.platform,
          emailData: {
            to,
            subject,
            sender: await this.getOrganizationSender(organizationId),
            organizationId
          }
        };
      }
      
      // Log the error to file in development
      if (isDevelopment()) {
        try {
          await this.logEmailError(errorDetails);
        } catch (logError) {
          console.error('❌ Failed to log error to file:', logError);
        }
      }
      
      console.log('📧 === EMAIL DELIVERY ATTEMPT FAILED ===\n');
      
      // In development mode, provide troubleshooting tips and continue operation
      if (isDevelopment()) {
        console.log('📧 Critical error troubleshooting suggestions:');
        console.log('1. Check the application logs for detailed error information');
        console.log('2. Verify database connectivity if this is a database-related error');
        console.log('3. Check system resources if experiencing memory or timeout issues');
        console.log('4. Review the logs directory for detailed error logs');
        
        // In development, log the email content that would have been sent
        console.log('📧 Email would have been sent (development mode - continuing with operation):');
        console.log(JSON.stringify({
          to,
          subject,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          html: html ? (html.substring(0, 100) + (html.length > 100 ? '...' : '')) : undefined
        }, null, 2));
        
        return true; // Allow operations to continue in development
      }
      
      // In production, fail appropriately to ensure proper error handling by caller
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