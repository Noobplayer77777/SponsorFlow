'use client';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [gmailStatus, setGmailStatus] = useState<any>(null);

  useEffect(() => {
    const checkGmail = async () => {
      try {
        const res = await api.get('/gmail/status');
        setGmailStatus(res);
      } catch (e) {
        console.error('Failed to fetch Gmail status');
      }
    };
    checkGmail();
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await api.get('/gmail/auth');
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      alert('Failed to initiate Gmail connection');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">Logout</button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-4 mb-8">
        <h2 className="text-xl font-semibold">Welcome, {user?.name}</h2>
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>

        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">Gmail Integration</h3>
          {gmailStatus?.connected ? (
            <div className="text-green-600 font-medium">
              ✓ Connected to Gmail ({gmailStatus.email})
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Connect your Gmail to send sponsorship emails directly.</p>
              <button 
                onClick={handleConnectGmail}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
              >
                Connect Gmail
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/companies" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block">
          <h3 className="text-xl font-bold mb-2">Manage Companies</h3>
          <p className="text-gray-600">Add, edit, assign, and import companies.</p>
        </Link>
        <Link href="/admin/templates" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition block">
          <h3 className="text-xl font-bold mb-2">Email Templates</h3>
          <p className="text-gray-600">Create and edit dynamic outreach templates.</p>
        </Link>
      </div>
    </div>
  );
}
