'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    website: '',
    industry: '',
    location: '',
    status: '',
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await api.get(`/companies/${params.id}`);
        const data = res.data;
        setFormData({
          companyName: data.companyName || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          website: data.website || '',
          industry: data.industry || '',
          location: data.location || '',
          status: data.status || 'NOT_ASSIGNED',
        });
      } catch (error) {
        alert('Failed to load company');
        router.push('/companies');
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/companies/${params.id}`, formData);
      alert('Company updated successfully');
      router.push('/companies');
    } catch (error: any) {
      alert('Failed to update company: ' + (error.message || 'Validation error'));
    }
  };

  const handleLock = async () => {
    try {
      await api.post(`/companies/${params.id}/lock`, {});
      alert('Lock acquired! You can now compose the first email (5 min limit).');
      // In future: Redirect to composer
    } catch (error: any) {
      alert(error.message || 'Failed to acquire lock');
    }
  };

  const handleUnlock = async () => {
    try {
      await api.post(`/companies/${params.id}/unlock`, {});
      alert('Lock released.');
    } catch (error: any) {
      alert('Failed to release lock');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/companies" className="text-gray-500 hover:text-gray-900">← Back</Link>
          <h1 className="text-2xl font-bold">Company Details & Edit</h1>
        </div>
        <div className="flex gap-2">
           <button onClick={handleLock} className="bg-orange-500 text-white px-3 py-1 rounded shadow hover:bg-orange-600 text-sm">
             Draft Email (Lock)
           </button>
           <button onClick={handleUnlock} className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-sm">
             Release Lock
           </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input required type="text" className="w-full border p-2 rounded" 
            value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input type="text" className="w-full border p-2 rounded" 
            value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className="w-full border p-2 rounded" 
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border p-2 rounded"
            value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
            <option value="NOT_ASSIGNED">Not Assigned</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="EMAIL_DRAFTED">Email Drafted</option>
            <option value="EMAIL_SENT">Email Sent</option>
            <option value="OPENED">Opened</option>
            <option value="REPLIED">Replied</option>
            <option value="INTERESTED">Interested</option>
            <option value="NEGOTIATING">Negotiating</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700">
          Save Changes
        </button>
      </form>
    </div>
  );
}
