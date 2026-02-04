import type { HandlerEvent } from '@netlify/functions';
import { authenticate, checkAdmin } from './auth';

export async function requireAuth(event: HandlerEvent) {
  const authHeader =
    (event.headers?.authorization as string | undefined) ||
    (event.headers?.Authorization as string | undefined);

  const { user, error } = await authenticate(authHeader);

  if (error || !user) {
    return { ok: false as const, statusCode: 401, error: error || 'Unauthorized' };
  }

  const isAdmin = await checkAdmin(user.id);
  if (!isAdmin) {
    return { ok: false as const, statusCode: 403, error: 'Forbidden (admin only)' };
  }

  return { ok: true as const, statusCode: 200, user };
}
