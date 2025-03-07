import type { InsertSystemConfig } from "@shared/schema";

interface CreateInboxResponse {
  id: string;
  emailAddress: string;
}

export class MailSlurpService {
  private apiKey: string;
  private baseUrl = 'https://api.mailslurp.com';

  constructor() {
    const apiKey = process.env.MAILSLURP_API_KEY;
    if (!apiKey) {
      throw new Error('MAILSLURP_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async createInbox(): Promise<InsertSystemConfig> {
    const response = await fetch(`${this.baseUrl}/inboxes`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create inbox: ${await response.text()}`);
    }

    const inbox: CreateInboxResponse = await response.json();
    
    return {
      emailAddress: inbox.emailAddress,
      inboxId: inbox.id,
    };
  }
}

export const mailslurpService = new MailSlurpService();
