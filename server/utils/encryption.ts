/**
 * Utility for encrypting and decrypting sensitive data
 * 
 * This implementation uses a simple symmetric encryption for demonstration.
 * In a production environment, you would want to use a more secure approach
 * with proper key management and stronger algorithms.
 */

import * as crypto from 'crypto';

// In a real application, this would be stored securely in environment variables
// and not hardcoded in the source code
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'disaster-recovery-platform-encryption-key';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a string using AES-256-CBC encryption
 * 
 * @param text The plain text to encrypt
 * @returns The encrypted text in format: iv:encryptedText (base64 encoded)
 */
export function encrypt(text: string): string {
  // Create a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher with key and iv
  const cipher = crypto.createCipheriv(
    ALGORITHM, 
    crypto.createHash('sha256').update(ENCRYPTION_KEY).digest().subarray(0, 32),
    iv
  );
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Return iv + encrypted data in base64 format
  return `${iv.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts an encrypted string using AES-256-CBC encryption
 * 
 * @param encryptedText The encrypted text in format: iv:encryptedText (base64 encoded)
 * @returns The decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    // Split the encrypted text into iv and encrypted parts
    const [ivString, encrypted] = encryptedText.split(':');
    
    if (!ivString || !encrypted) {
      throw new Error('Invalid encrypted text format');
    }
    
    // Convert iv back to Buffer
    const iv = Buffer.from(ivString, 'base64');
    
    // Create decipher with key and iv
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      crypto.createHash('sha256').update(ENCRYPTION_KEY).digest().subarray(0, 32),
      iv
    );
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return a placeholder for failed decryption
    return '[Decryption failed]';
  }
}

/**
 * Checks if a string is encrypted using our format
 * This is useful for handling existing unencrypted data
 * 
 * @param text The text to check
 * @returns true if the text appears to be encrypted
 */
export function isEncrypted(text: string): boolean {
  // Check if the text has our IV:encrypted format with proper base64 encoding
  const parts = text.split(':');
  if (parts.length !== 2) return false;
  
  const [ivString, encrypted] = parts;
  
  // Check if both parts are valid base64
  try {
    Buffer.from(ivString, 'base64');
    Buffer.from(encrypted, 'base64');
    return true;
  } catch (e) {
    return false;
  }
}