# GitBook Auth Backend pro Upcomers Academy

Jednoduchý autentizační backend pro GitBook s magic link přihlášením a whitelist emailů.

## Jak to funguje

1. Uživatel přijde na GitBook dokumentaci
2. GitBook ho přesměruje na login stránku (tento backend)
3. Uživatel zadá email
4. Pokud je email ve whitelistu, dostane magic link na email
5. Po kliknutí na odkaz je přesměrován zpět do GitBook s JWT tokenem
6. GitBook ho pustí dovnitř

## Deploy na Vercel

### Krok 1: Nahrát na Vercel

1. Jdi na https://vercel.com
2. Přihlas se (můžeš použít email)
3. Klikni "Add New" → "Project"
4. Klikni "Upload" a nahraj celou složku `gitbook-auth`
5. Vercel ti dá URL (např. `https://gitbook-auth-xxx.vercel.app`)

### Krok 2: Nastavit Environment Variables

V Vercel dashboardu jdi do Settings → Environment Variables a přidej:

| Name | Value |
|------|-------|
| SUPABASE_URL | https://lougbvyatshwwrfsjqus.supabase.co |
| SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (celý klíč) |
| GITBOOK_URL | https://upcomers.gitbook.io/upcomers-academy |
| GITBOOK_SIGNING_KEY | yCKGK0Jl8oAYXSJL6R9Z4SmSCvFqmql1siU9jHITn9Dmc4okB9OHx+yMKJsYT0uDiP5Gf94yvsR7Cr3r5v7iZA== |
| AUTH_CALLBACK_URL | https://TVOJE-VERCEL-URL/auth/callback |

### Krok 3: Aktualizovat Supabase

V Supabase → Authentication → URL Configuration:
- Site URL: `https://TVOJE-VERCEL-URL`
- Redirect URLs: `https://TVOJE-VERCEL-URL/auth/callback`

### Krok 4: Nastavit GitBook

V GitBook → Site settings → Audience → Authenticated access:
- Fallback URL: `https://TVOJE-VERCEL-URL/login`

## Správa uživatelů

Přidat/odebrat uživatele:
1. Jdi do Supabase → Table Editor → allowed_emails
2. Insert row s emailem pro přidání
3. Delete row pro odebrání
