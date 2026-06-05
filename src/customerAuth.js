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

// company email se customer login block — ek email = ek role
export async function getCustomer() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // CHECK: kya ye email kisi company ka owner_email hai?
  const { data: companyMatch } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('owner_email', user.email)
    .maybeSingle()

  if (companyMatch) {
    // ye business email hai — customer ke roop mein login block
    await supabase.auth.signOut()
    return { blocked: true, reason: 'business_email', companyName: companyMatch.name }
  }

  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (data) return data

  // Row nahi mili — upsert karo
  const { data: newData } = await supabase
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
  return newData || null
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

// Lead profile complete — phone + area save (Get 3 Quotes ke liye)
export async function updateCustomerProfile(id, fields) {
  const { data, error } = await supabase
    .from('customers')
    .update({
      ...(fields.full_name !== undefined ? { full_name: fields.full_name } : {}),
      ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
      ...(fields.area !== undefined ? { area: fields.area } : {}),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('Profile update error:', error); return null }
  return data
}
