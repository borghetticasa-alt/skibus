
export async function upstashRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ success: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error("Upstash Redis credentials missing. Falling back to bypass.");
    return { success: true, remaining: 999 };
  }

  try {
    // Implementazione sliding window con Lua script per atomicità
    const luaScript = `
      local current = redis.call("INCR", KEYS[1])
      if current == 1 then
        redis.call("EXPIRE", KEYS[1], ARGV[1])
      end
      return current
    `;

    const response = await fetch(`${url}/eval`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        script: luaScript,
        args: [windowSeconds],
        keys: [key],
      }),
    });

    if (!response.ok) throw new Error("Upstash API Error");

    const result = await response.json();
    const current = result.result;

    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fallback sicuro: permetti l'azione ma logga l'errore
    return { success: true, remaining: 0 };
  }
}
