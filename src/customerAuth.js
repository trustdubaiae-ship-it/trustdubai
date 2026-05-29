import { supabase } from './supabase'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href.includes('trustdubai.ae') 
        ? window.location.href 
        : 'https://trustdubai.ae',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  if (error) console.error('Google login error:', error)
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getCustomer() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Business portal user hai toh customer nahi hai
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return data || null
}

export async function upsertCustomer(user) {
  const { data } = await supabase
    .from('customers')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
      last_login: new Date().toISOString()
    }, { onConflict: 'id' })
    .select()
    .single()

  return data
}
