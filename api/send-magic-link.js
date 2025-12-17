import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.redirect('/login');
  }

  // Parse form data
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  const params = new URLSearchParams(body);
  const email = params.get('email')?.toLowerCase().trim();

  if (!email) {
    return res.redirect('/login?error=' + encodeURIComponent('Zadej email'));
  }

  // Check if email is in whitelist
  const { data: allowedEmail, error: whitelistError } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', email)
    .single();

  if (whitelistError || !allowedEmail) {
    return res.redirect('/login?error=' + encodeURIComponent('Tento email nemá povolen přístup'));
  }

  // Send magic link
  const { error: authError } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      emailRedirectTo: process.env.AUTH_CALLBACK_URL
    }
  });

  if (authError) {
    console.error('Auth error:', authError);
    return res.redirect('/login?error=' + encodeURIComponent('Chyba při odesílání emailu. Zkus to znovu.'));
  }

  return res.redirect('/login?success=1');
}
