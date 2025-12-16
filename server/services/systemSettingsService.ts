import { db } from '../db';
import { systemSettings } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt, isEncryptionAvailable } from '../utils/encryption';

export interface TwilioSettings {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  isConfigured: boolean;
}

interface CacheEntry {
  value: string;
  timestamp: number;
}

class SystemSettingsService {
  private cache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get a single setting value
   */
  async getSetting(category: string, key: string): Promise<string | null> {
    const cacheKey = `${category}.${key}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.category, category),
          eq(systemSettings.key, key)
        )
      )
      .limit(1);

    if (!setting) return null;

    let value: string;
    if (setting.isEncrypted && setting.encryptedValue) {
      value = decrypt(setting.encryptedValue);
    } else {
      value = setting.value || '';
    }

    this.cache.set(cacheKey, { value, timestamp: Date.now() });
    return value;
  }

  /**
   * Set a single setting value
   */
  async setSetting(
    category: string,
    key: string,
    value: string,
    options: { encrypt?: boolean; description?: string } = {}
  ): Promise<void> {
    const { encrypt: shouldEncrypt = false, description } = options;

    // Check if encryption is available when trying to encrypt
    if (shouldEncrypt && !isEncryptionAvailable()) {
      throw new Error('Encryption is not available. Please configure ENCRYPTION_KEY environment variable.');
    }

    const existing = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.category, category),
          eq(systemSettings.key, key)
        )
      )
      .limit(1);

    const data: Record<string, unknown> = {
      category,
      key,
      isEncrypted: shouldEncrypt,
      updatedAt: new Date(),
    };

    if (shouldEncrypt) {
      data.encryptedValue = encrypt(value);
      data.value = null;
    } else {
      data.value = value;
      data.encryptedValue = null;
    }

    if (description) {
      data.description = description;
    }

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set(data)
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      await db.insert(systemSettings).values({
        ...data,
        createdAt: new Date(),
      } as typeof systemSettings.$inferInsert);
    }

    // Clear cache for this key
    this.cache.delete(`${category}.${key}`);
  }

  /**
   * Get all Twilio settings
   */
  async getTwilioSettings(): Promise<TwilioSettings> {
    const accountSid = await this.getSetting('twilio', 'account_sid');
    const authToken = await this.getSetting('twilio', 'auth_token');
    const phoneNumber = await this.getSetting('twilio', 'phone_number');

    return {
      accountSid: accountSid || '',
      authToken: authToken || '',
      phoneNumber: phoneNumber || '',
      isConfigured: !!(accountSid && authToken && phoneNumber),
    };
  }

  /**
   * Set Twilio settings
   */
  async setTwilioSettings(
    settings: Partial<Omit<TwilioSettings, 'isConfigured'>>
  ): Promise<void> {
    if (settings.accountSid !== undefined) {
      await this.setSetting('twilio', 'account_sid', settings.accountSid, {
        description: 'Twilio Account SID',
      });
    }
    if (settings.authToken !== undefined) {
      await this.setSetting('twilio', 'auth_token', settings.authToken, {
        encrypt: true,
        description: 'Twilio Auth Token (encrypted)',
      });
    }
    if (settings.phoneNumber !== undefined) {
      await this.setSetting('twilio', 'phone_number', settings.phoneNumber, {
        description: 'Twilio Phone Number',
      });
    }
  }

  /**
   * Clear the settings cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific category
   */
  clearCategoryCache(category: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${category}.`)) {
        this.cache.delete(key);
      }
    }
  }
}

export const systemSettingsService = new SystemSettingsService();
