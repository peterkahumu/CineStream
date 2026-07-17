import { useState, useEffect, useCallback } from 'react'

export interface Region {
  code: string
  name: string
}

export interface Language {
  code: string
  name: string
}

export function useCountries() {
  const [regions, setRegions] = useState<Region[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(true)

  const loadCountries = useCallback(async () => {
    try {
      const res = await fetch('/api/countries')
      const data = await res.json()
      
      // Map Regions
      const rList = data.map((d: any) => ({
        code: d.alpha2Code,
        name: `${d.flag} ${d.name}`
      })).sort((a: Region, b: Region) => a.name.localeCompare(b.name))
      setRegions(rList)

      // Map Languages (extract unique languages)
      const lMap = new Map<string, string>()
      data.forEach((d: any) => {
        if (d.languages) {
          d.languages.forEach((lang: any) => {
            if (lang.iso639_1 && lang.name) {
              lMap.set(lang.iso639_1, lang.name)
            }
          })
        }
      })
      const lList = Array.from(lMap.entries()).map(([code, name]) => ({
        code, name
      })).sort((a, b) => a.name.localeCompare(b.name))
      
      setLanguages(lList)
    } catch (error) {
      console.error('Failed to load countries', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCountries()
  }, [loadCountries])

  return { regions, languages, loading }
}
