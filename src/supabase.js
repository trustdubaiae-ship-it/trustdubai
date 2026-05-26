import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ribdorraxxhfbfkjhpie.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_LvszMk_GssDM_x64UNuoMg_WR2oy7ve'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
