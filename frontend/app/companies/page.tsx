'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

export default function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchCompanies = async () => {
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await api.get(`/companies?${query}`);
      setCompanies(res.data);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search, statusFilter]);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await api.upload('/companies/import', file);
      alert(res.message);
      fetchCompanies();
    } catch (error: any) {
      console.error(error);
      alert('Import failed: ' + (error.message || 'Unknown error'));
      if (error.errors) {
        console.log("Import errors:", error.errors);
      }
    } finally {
      setImporting(false);
      setFile(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    try {
      await api.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (error) {
      alert('Failed to delete. Make sure you are an Admin.');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <div className="flex gap-4 items-center">
          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-2 border p-2 rounded">
              <input 
                type="file" 
                accept=".csv" 
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="text-sm"
              />
              <button 
                onClick={handleImport}
                disabled={!file || importing}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
            </div>
          )}
          <Link href="/companies/new" className="bg-blue-600 text-white px-4 py-2 rounded font-medium">
            + Add Company
          </Link>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, contact..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border p-2 rounded flex-1"
        />
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border p-2 rounded w-48"
        >
          <option value="">All Statuses</option>
          <option value="NOT_ASSIGNED">Not Assigned</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="EMAIL_SENT">Email Sent</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-600">Company Name</th>
              <th className="p-4 font-semibold text-gray-600">Contact Person</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Assigned To</th>
              <th className="p-4 font-semibold text-gray-600">Lock Status</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{c.companyName}</td>
                <td className="p-4">{c.contactPerson || '-'}</td>
                <td className="p-4">{c.email || '-'}</td>
                <td className="p-4 text-sm text-gray-700">
                  {c.assignment?.user?.name || <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                <td className="p-4 text-sm text-gray-700">
                  {c.lockedById ? (
                    <span className="text-orange-600 font-medium">Locked for drafting</span>
                  ) : (
                    <span className="text-green-600">Unlocked</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-3">
                  <Link href={`/companies/${c.id}`} className="text-blue-600 hover:underline">View/Edit</Link>
                  {user?.role === 'ADMIN' && (
                    <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:underline">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No companies found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button 
          disabled={page <= 1} 
          onClick={() => setPage(p => p - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => p + 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
