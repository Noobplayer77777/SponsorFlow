'use client';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(user.role === 'ADMIN' ? '/admin' : '/member');
    }
  }, [user, router]);

  const handleSuccess = async (credentialResponse: any) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      
      if (data.success) {
        login(data.token, data.user);
      } else {
        alert('Login failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during login.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">SponsorFlow</h1>
        <p className="text-gray-500 mb-8">Sign in to manage your sponsorships</p>
        
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => {
              console.log('Login Failed');
              alert('Google Login Failed');
            }}
          />
        </div>
      </div>
    </div>
  );
}
