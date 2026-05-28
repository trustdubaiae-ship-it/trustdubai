import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

export function useCompanySearch(query, minChars = 2) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef()

  useEffect(() => {
    if (query.trim().length < minChars) {
      setResults([])
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('search_companies', { query: query.trim() })

      if (!error && data) setResults(data)
      setLoading(false)
    }, 220)

    return () => clearTimeout(debounceRef.current)
  }, [query, minChars])

  function clear() { setResults([]) }

  return { results, loading, clear }
}
