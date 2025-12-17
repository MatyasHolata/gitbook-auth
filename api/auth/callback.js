import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('Auth error:', error, error_description);
    return res.redirect('/login?error=' + encodeURIComponent('Přihlášení selhalo. Zkus to znovu.'));
  }

  if (!code) {
    return res.redirect('/login?error=' + encodeURIComponent('Neplatný odkaz'));
  }

  // Exchange code for session
  const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError || !data.user) {
    console.error('Session error:', sessionError);
    return res.redirect('/login?error=' + encodeURIComponent('Přihlášení selhalo. Zkus to znovu.'));
  }

  // Double-check whitelist (security)
  const { data: allowedEmail } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', data.user.email.toLowerCase())
    .single();

  if (!allowedEmail) {
    return res.redirect('/login?error=' + encodeURIComponent('Tento email nemá povolen přístup'));
  }

  // Generate JWT for GitBook
  const gitbookSigningKey = process.env.GITBOOK_SIGNING_KEY;
  const gitbookUrl = process.env.GITBOOK_URL;

  const jwt = await new jose.SignJWT({
    email: data.user.email
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(gitbookSigningKey));

  // Redirect to GitBook with JWT
  const redirectUrl = `${gitbookUrl}?jwt_token=${jwt}`;
  return res.redirect(redirectUrl);
}
