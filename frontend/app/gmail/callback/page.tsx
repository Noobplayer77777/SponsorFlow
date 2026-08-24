'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

export default function GmailCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const hasFetched = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    
    if (code && !hasFetched.current) {
      hasFetched.current = true;
      
      api.post('/gmail/callback', { code })
        .then(() => {
          alert('Gmail connected successfully!');
          if (user?.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/member');
          }
        })
        .catch(err => {
          alert('Failed to connect Gmail: ' + (err.message || 'Unknown error'));
          if (user?.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/member');
          }
        });
    } else if (!code) {
      router.push('/');
    }
  }, [searchParams, router, user]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Connecting Gmail...</h2>
        <p className="text-gray-600">Please wait while we secure your authorization.</p>
      </div>
    </div>
  );
}
