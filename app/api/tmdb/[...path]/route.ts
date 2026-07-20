import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const API_KEY = process.env.TMDB_API_KEY

  if (!API_KEY) {
    return NextResponse.json(
      {
        error: 'TMDB_API_KEY is not configured.',
        hint: 'Add TMDB_API_KEY=your_key to your .env.local file and restart the server.',
      },
      { status: 503 }
    )
  }

  const { path } = await params
  const tmdbPath = path.join('/')

  // Forward all query params from the client
  const forwardedParams = new URLSearchParams(request.nextUrl.searchParams)
  
  let headers: HeadersInit | undefined = undefined;

  // v4 tokens are long JWTs, v3 keys are 32 chars.
  if (API_KEY.length > 100) {
    headers = { 'Authorization': `Bearer ${API_KEY}` }
  } else {
    forwardedParams.set('api_key', API_KEY)
  }

  // Safe Search Ceiling (Client requests)
  const maxCert = request.cookies.get('cp_maxCertification')?.value
  if (maxCert && maxCert !== 'none' && (tmdbPath === 'discover/movie' || tmdbPath === 'discover/tv')) {
    forwardedParams.set('certification_country', 'US')
    forwardedParams.set('certification.lte', maxCert)
  }

  try {
    const tmdbUrl = `${TMDB_BASE}/${tmdbPath}?${forwardedParams.toString()}`

    const res = await fetch(tmdbUrl, {
      headers,
      // Cache responses for 5 minutes on the server — reduces TMDB calls
      next: { revalidate: 300 },
    })

    const data = await res.json()

    return NextResponse.json(data, {
      status: res.status,
      headers: {
        // Allow browser to cache for 2 minutes
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach TMDB. Check your network or API key.' },
      { status: 502 }
    )
  }
}
