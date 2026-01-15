
import { upstashRateLimit } from '../../../shared/upstash-client';

export async function checkRateLimit(userId: string, action: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `ratelimit:${userId}:${action}`;
  const result = await upstashRateLimit(key, limit, windowSeconds);
  return result.success;
}
