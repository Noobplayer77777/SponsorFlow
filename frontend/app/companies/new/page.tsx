'use client';

import { useState } from 'react';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewCompanyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    website: '',
    industry: '',
    location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/companies', formData);
      router.push('/companies');
    } catch (error: any) {
      alert('Failed to add company: ' + (error.message || 'Validation error'));
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/companies" className="text-gray-500 hover:text-gray-900">← Back</Link>
        <h1 className="text-2xl font-bold">Add New Company</h1>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input type="url" className="w-full border p-2 rounded" 
            value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
          <input type="text" className="w-full border p-2 rounded" 
            value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700">
          Save Company
        </button>
      </form>
    </div>
  );
}
