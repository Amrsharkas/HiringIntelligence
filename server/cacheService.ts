import crypto from 'crypto';
import { db } from './db';
import { cache } from '../shared/schema';
import { eq } from 'drizzle-orm';

export class CacheService {
  generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    const result = await db.select()
      .from(cache)
      .where(eq(cache.key, key))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0].value as T;
  }

  async set(key: string, value: any): Promise<void> {
    await db.insert(cache)
      .values({ key, value })
      .onConflictDoNothing();
  }

  async delete(key: string): Promise<void> {
    await db.delete(cache).where(eq(cache.key, key));
  }

  // Helper: Resume parsing cache key (based on file size + custom rules)
  resumeParseKey(fileSize: number, customRules?: string): string {
    const rulesHash = customRules ? `:${this.generateHash(customRules).slice(0, 16)}` : '';
    return `resume_parsing:${fileSize}${rulesHash}`;
  }

  // Helper: Job scoring cache key (based on file hash + job description + requirements + custom rules hash)
  jobScoringKey(fileContent: string, jobDescription: string, jobRequirements: string, customRules?: string): string {
    const fileHash = this.generateHash(fileContent);
    const rulesComponent = customRules || '';
    const jobContentHash = this.generateHash(jobDescription + jobRequirements + rulesComponent);
    return `job_scoring:${fileHash}:${jobContentHash}`;
  }
}

export const cacheService = new CacheService();
