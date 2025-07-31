// Quick script to create a test user for debugging login
const { hashPassword } = require('./server/auth.ts');
const { storage } = require('./server/storage.ts');

async function createTestUser() {
  try {
    const hashedPassword = await hashPassword('test123');
    
    const testUser = await storage.createUser({
      email: 'test@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isVerified: true,
      emailVerified: true, // Skip email verification for testing
      verificationToken: null,
    });
    
    console.log('✅ Test user created:', testUser.email);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser();