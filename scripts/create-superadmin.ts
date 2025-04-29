import { db } from '../server/db';
import { users, insertUserSchema } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createSuperAdmin() {
  try {
    console.log('Creating super admin user...');
    
    // Check if super admin already exists
    const existingAdmin = await db.select().from(users).where(eq(users.email, 'superadmin@example.com'));
    
    if (existingAdmin.length > 0) {
      console.log('Super admin already exists');
      return existingAdmin[0];
    }
    
    // Create super admin
    const hashedPassword = await hashPassword('superadmin123');
    
    const [superAdmin] = await db.insert(users).values({
      email: 'superadmin@example.com',
      username: 'superadmin',
      password: hashedPassword,
      userType: 'practitioner',
      role: 'super_admin',
      firstName: 'Super',
      lastName: 'Admin',
    }).returning();
    
    console.log('Super admin created successfully:', superAdmin);
    return superAdmin;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  } finally {
    // The pool is managed by the server, no need to explicitly end it
    console.log('Note: DB connection managed by the pool');
  }
}

createSuperAdmin().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});