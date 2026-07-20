const TMDB_URL_PATTERN = /https:\/\/api\.themoviedb\.org[^\s)"']*/g

function redactTmdbLogChunk(chunk: unknown): unknown {
  if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
    return chunk
  }

  const text = chunk.toString()

  const redacted = text
    .replace(TMDB_URL_PATTERN, '[TMDB_REQUEST_REDACTED]')
    .replace(/api_key=[^&\s)"']+/g, 'api_key=[REDACTED]')

  if (redacted === text) {
    return chunk
  }

  return Buffer.isBuffer(chunk) ? Buffer.from(redacted) : redacted
}

function patchStreamWrite(stream: NodeJS.WriteStream) {
  const originalWrite = stream.write.bind(stream)

  stream.write = ((chunk: unknown, encoding?: BufferEncoding | ((error?: Error | null) => void), callback?: (error?: Error | null) => void) => {
    const safeChunk = redactTmdbLogChunk(chunk)

    if (typeof encoding === 'function') {
      return originalWrite(safeChunk as never, encoding)
    }

    return originalWrite(safeChunk as never, encoding, callback)
  }) as typeof stream.write
}

declare global {
  var __tmdbLogRedactionInstalled: boolean | undefined
}

export async function register() {
  if (globalThis.__tmdbLogRedactionInstalled) {
    return
  }

  patchStreamWrite(process.stdout)
  patchStreamWrite(process.stderr)
  globalThis.__tmdbLogRedactionInstalled = true
}
