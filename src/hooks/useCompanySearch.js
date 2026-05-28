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
        .from('companies')
        .select('id, company_name, category, slug')
        .ilike('company_name', `%${query.trim()}%`)
        .eq('status', 'approved')
        .limit(6)

      if (!error && data) setResults(data)
      setLoading(false)
    }, 220)

    return () => clearTimeout(debounceRef.current)
  }, [query, minChars])

  function clear() { setResults([]) }

  return { results, loading, clear }
}
