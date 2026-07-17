import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://countries.dev/countries?fields=name,flag,alpha2Code,languages', {
      next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch countries: ${res.status}`)
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Countries fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 })
  }
}
