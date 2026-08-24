'use client';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'MEMBER') {
      router.push('/admin');
    }
  }, [user, router]);

  if (!user || user.role !== 'MEMBER') return null;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Member Dashboard</h1>
          <p className="text-gray-500">Welcome, {user.name} ({user.email})</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
            {user.role}
          </span>
          <button 
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">My Assignments</h2>
        <p className="text-gray-600">Member functionality (managing assigned companies, drafting emails, etc.) will be implemented here.</p>
      </main>
    </div>
  );
}
