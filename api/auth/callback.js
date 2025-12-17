import { createClient } from '@supabase/supabase-js';
import * as jose from 'jose';

export default async function handler(req, res) {
  // Log all query params for debugging
  console.log('Callback params:', req.query);
  
  const { code, token_hash, type, access_token, refresh_token, error, error_description } = req.query;

  if (error) {
    console.error('Auth error:', error, error_description);
    return res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  let user = null;

  try {
    // Method 1: PKCE flow (code)
    if (code) {
      console.log('Using code flow');
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      if (sessionError) throw sessionError;
      user = data?.user;
    }
    // Method 2: Token hash flow
    else if (token_hash) {
      console.log('Using token_hash flow, type:', type);
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type || 'magiclink'
      });
      if (verifyError) throw verifyError;
      user = data?.user;
    }
    // Method 3: Direct tokens (older flow)
    else if (access_token) {
      console.log('Using access_token flow');
      const { data, error: setError } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || ''
      });
      if (setError) throw setError;
      user = data?.user;
    }
    else {
      // No valid params - show page that handles hash fragments
      return res.send(getClientSideHandler());
    }
  } catch (err) {
    console.error('Auth error:', err);
    return res.redirect('/login?error=' + encodeURIComponent('Invalid or expired link.'));
  }

  if (!user) {
    return res.redirect('/login?error=' + encodeURIComponent('Login failed.'));
  }

  // Check whitelist
  const { data: allowedEmail } = await supabase
    .from('allowed_emails')
    .select('email')
    .eq('email', user.email.toLowerCase())
    .single();

  if (!allowedEmail) {
    return res.redirect('/login?error=' + encodeURIComponent('This email is not authorized'));
  }

  // Generate JWT for GitBook
  const jwt = await new jose.SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(process.env.GITBOOK_SIGNING_KEY));

  return res.redirect(`${process.env.GITBOOK_URL}?jwt_token=${jwt}`);
}

function getClientSideHandler() {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
  <p>Authenticating, please wait...</p>
  <script>
    (async () => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      
      if (access_token) {
        window.location.href = '/auth/callback?access_token=' + access_token + '&refresh_token=' + (refresh_token || '');
      } else {
        window.location.href = '/login?error=' + encodeURIComponent('Invalid link');
      }
    })();
  </script>
</body>
</html>
  `;
}
