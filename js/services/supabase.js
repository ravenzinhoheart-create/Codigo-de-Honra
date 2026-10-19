// =========================================================
// CÓDIGO DE HONRA — Supabase Client
// =========================================================
// A chave publishable é própria para o frontend com RLS ativo.
// NUNCA use uma secret/service_role key neste aplicativo.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config/supabase-config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("SEU_PROJETO")) {
    console.warn("[SUPABASE] Configure js/config/supabase-config.js antes de usar o backend.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "cdhmc-supabase-auth"
    }
});

