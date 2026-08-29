'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '../contexts/AuthContext';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Use environment variable for Google Client ID or the hardcoded fallback
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '808561673285-mtmhd89eftchpg8t4slhqlfogq96davo.apps.googleusercontent.com';

  return (
    <SessionProvider>
      <GoogleOAuthProvider clientId={clientId}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </GoogleOAuthProvider>
    </SessionProvider>
  );
}
