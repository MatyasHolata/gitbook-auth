import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { code, token_hash, type, error, error_description } = req.query;

  if (error) {
    console.error('Auth error:', error, error_description);
    return res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }

  let session = null;

  // Handle PKCE flow (code)
  if (code) {
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      console.error('Session error:', sessionError);
      return res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
    }
    session = data;
  }
  // Handle magic link flow (token_hash)
  else if (token_hash && type === 'magiclink') {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'magiclink'
    });
    if (verifyError) {
      console.error('Verify error:', verifyError);
      return res.redirect('/login?error=' + encodeURIComponent('Invalid or expired link.'));
    }
    session = data;
  }
  else {
    return res.redirect('/login?error=' + encodeURIComponent('Invalid link'));
  }

  if (!session?.user) {
    return res.redirect('/login?error=' + encodeURIComponent('Login failed.'));
  }

  // Double-check whitelist (security)
  const { data: allowedEmail } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', session.user.email.toLowerCase())
    .single();

  if (!allowedEmail) {
    return res.redirect('/login?error=' + encodeURIComponent('This email is not authorized'));
  }

  // Generate JWT for GitBook
  const gitbookSigningKey = process.env.GITBOOK_SIGNING_KEY;
  const gitbookUrl = process.env.GITBOOK_URL;

  const jwt = await new jose.SignJWT({
    email: session.user.email
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(gitbookSigningKey));

  // Redirect to GitBook with JWT
  const redirectUrl = `${gitbookUrl}?jwt_token=${jwt}`;
  return res.redirect(redirectUrl);
}
