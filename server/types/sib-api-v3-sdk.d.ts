declare module 'sib-api-v3-sdk' {
  export namespace ApiClient {
    export const instance: any;
  }
  
  export class TransactionalEmailsApi {
    sendTransacEmail(emailData: SendSmtpEmail): Promise<any>;
  }
  
  export class SendSmtpEmail {
    constructor(data?: {
      sender?: { email: string; name?: string };
      to?: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      replyTo?: { email: string; name?: string };
      headers?: Record<string, string>;
      subject?: string;
      htmlContent?: string;
      textContent?: string;
      templateId?: number;
      params?: Record<string, any>;
      attachment?: Array<any>;
      tags?: Array<string>;
    });
    
    sender: { email: string; name?: string };
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    replyTo?: { email: string; name?: string };
    headers?: Record<string, string>;
    subject: string;
    htmlContent?: string;
    textContent?: string;
    templateId?: number;
    params?: Record<string, any>;
    attachment?: Array<any>;
    tags?: Array<string>;
  }
}