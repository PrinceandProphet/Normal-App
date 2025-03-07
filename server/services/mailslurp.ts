import type { InsertSystemConfig } from "@shared/schema";

interface CreateInboxResponse {
  id: string;
  emailAddress: string;
}

interface CreatePhoneResponse {
  id: string;
  phoneNumber: string;
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

  async createPhone(): Promise<{ phoneNumber: string, phoneId: string }> {
    const response = await fetch(`${this.baseUrl}/phone/numbers`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create phone number: ${await response.text()}`);
    }

    const phone: CreatePhoneResponse = await response.json();

    return {
      phoneNumber: phone.phoneNumber,
      phoneId: phone.id,
    };
  }
}

export const mailslurpService = new MailSlurpService();