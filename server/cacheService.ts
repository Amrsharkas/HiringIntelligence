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

  // Helper: Resume parsing cache key (based on file size)
  resumeParseKey(fileSize: number): string {
    return `resume_parsing:${fileSize}`;
  }

  // Helper: Job scoring cache key (based on file hash + jobId)
  jobScoringKey(fileContent: string, jobId: number): string {
    const fileHash = this.generateHash(fileContent);
    return `job_scoring:${fileHash}:${jobId}`;
  }
}

export const cacheService = new CacheService();
