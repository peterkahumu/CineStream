/**
 * Thin shell over the provider registry.
 * Resolves which providers are configured (env vars set) and returns them
 * in priority order as StreamingServer objects for use in server components.
 */
import PROVIDERS from './providers'

export interface StreamingServer {
  id: string
  name: string
  url: string
  tier: 'advanced' | 'basic'
}

/**
 * Returns only the configured providers (env var present and non-empty),
 * in the registry's priority order.
 * Safe to call in server components — reads process.env directly.
 */
export function getStreamingServers(): StreamingServer[] {
  const servers: StreamingServer[] = []

  for (const provider of PROVIDERS) {
    // NEXT_PUBLIC_ vars are available server-side as well as client-side
    const url =
      process.env[provider.envKey] ||
      process.env[provider.envKey.replace('NEXT_PUBLIC_', '')]

    if (url) {
      servers.push({
        id: provider.id,
        name: provider.name,
        url,
        tier: provider.tier,
      })
    }
  }

  return servers
}
