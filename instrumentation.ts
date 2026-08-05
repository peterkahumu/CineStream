export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Prevent double-patching if register() is called multiple times (e.g. in dev mode)
    if ((global as any).__tmdb_redact_patched) return;
    (global as any).__tmdb_redact_patched = true;

    // Prefer IPv4 for outbound fetch() calls (Neon, TMDB, etc). Node's undici fetch
    // tries IPv6 first by default; in Docker/dev-container networking IPv6 routes
    // often exist but don't actually work, so every request pays for a failed IPv6
    // attempt before falling back — and sometimes that attempt hard-fails instead of
    // falling back, surfacing as "TypeError: fetch failed" / AggregateError. This
    // makes IPv4 the first (and effectively only) attempt.
    const dns = await import('node:dns');
    dns.setDefaultResultOrder('ipv4first');

    /**
     * Defense-in-depth global stream patch.
     * Intercepts process.stdout and process.stderr to redact TMDB v3 API keys from URLs
     * (e.g., when Next.js fetch cache warnings print full request URLs).
     */
    function patchStream(stream: NodeJS.WriteStream) {
      const originalWrite = stream.write.bind(stream);

      stream.write = function (chunk: any, encoding?: any, callback?: any): boolean {
        if (typeof chunk === 'string') {
          const redacted = chunk
            .replace(/https:\/\/api\.themoviedb\.org[^\s)"']*/g, '[TMDB_REQUEST_REDACTED]')
            .replace(/api_key=[^&\s)"']+/g, 'api_key=[REDACTED]');
          return originalWrite(redacted, encoding, callback);
        } else if (Buffer.isBuffer(chunk)) {
          // Decode buffer, redact, then re-encode using the specified encoding or default utf8
          // This preserves the original encoding to avoid corrupting non-UTF-8 output
          const enc = typeof encoding === 'string' ? (encoding as BufferEncoding) : 'utf8';
          const text = chunk.toString(enc);

          if (text.includes('api.themoviedb.org') || text.includes('api_key=')) {
            const redacted = text
              .replace(/https:\/\/api\.themoviedb\.org[^\s)"']*/g, '[TMDB_REQUEST_REDACTED]')
              .replace(/api_key=[^&\s)"']+/g, 'api_key=[REDACTED]');
            return originalWrite(Buffer.from(redacted, enc), encoding, callback);
          }
        }

        return originalWrite(chunk, encoding, callback);
      } as any;
    }

    patchStream(process.stdout);
    patchStream(process.stderr);
  }
}
