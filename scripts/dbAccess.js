import { createClient } from '@supabase/supabase-js'

// Not sure if this is secure at all
const PUB_KEY = 'sb_publishable_8XCFnQ_4sjTsultRgCh2QA_fHZBEU_C'
const PROJ_URL = 'https://rnbzbvmawcnsvqgbttom.supabase.co'

// Create Supabase Client
const supabase = createClient(PROJ_URL, PUB_KEY)