'use client';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import Link from 'next/link';

export default function MemberDashboard() {
  const { user, logout } = useAuth();
  const [gmailStatus, setGmailStatus] = useState<any>(null);
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [gmailRes, compRes] = await Promise.all([
          api.get('/gmail/status'),
          api.get('/companies?limit=1000') // Fetching assigned/not assigned companies
        ]);
        setGmailStatus(gmailRes);
        setCompanies(compRes.data || []);
      } catch (e) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
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

  // Metrics
  const myAssigned = companies.filter(c => c.assignment?.userId === user?.id);
  
  const metrics = useMemo(() => {
    return {
      assigned: myAssigned.length,
      pending: myAssigned.filter(c => c.status === 'ASSIGNED' || c.status === 'EMAIL_DRAFTED').length,
      sent: myAssigned.filter(c => c.status === 'EMAIL_SENT').length,
      replies: myAssigned.filter(c => c.status === 'REPLIED').length,
      interested: myAssigned.filter(c => c.status === 'INTERESTED' || c.status === 'NEGOTIATING').length,
      followUpsDue: myAssigned.filter(c => c.followUpDate && new Date(c.followUpDate) <= new Date()).length
    };
  }, [myAssigned]);

  // Filtered Table Data (Only show companies assigned to THIS member)
  const filteredCompanies = myAssigned.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) || 
                          c.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-center text-gray-600">Loading Dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Member Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-4 items-center">
          {gmailStatus?.connected ? (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
              ✓ Gmail: {gmailStatus.email}
            </span>
          ) : (
            <button onClick={handleConnectGmail} className="bg-red-50 text-red-600 px-4 py-2 rounded shadow-sm border border-red-200 hover:bg-red-100 text-sm font-medium">
              Connect Gmail
            </button>
          )}
          <button onClick={logout} className="text-gray-500 hover:text-gray-900 text-sm font-medium">Logout</button>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Assigned Companies', value: metrics.assigned, color: 'blue' },
          { label: 'Pending Outreach', value: metrics.pending, color: 'orange' },
          { label: 'Emails Sent', value: metrics.sent, color: 'purple' },
          { label: 'Replies', value: metrics.replies, color: 'cyan' },
          { label: 'Interested', value: metrics.interested, color: 'green' },
          { label: 'Follow-ups Due', value: metrics.followUpsDue, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-4 rounded-xl shadow-sm border-t-4 border-${stat.color}-500`}>
            <div className="text-sm text-gray-500 font-medium mb-1">{stat.label}</div>
            <div className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">My Assigned Companies</h2>
          
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Search companies..." 
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select 
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-semibold text-gray-900">Company Name</th>
                <th className="p-3 font-semibold text-gray-900">Contact Person</th>
                <th className="p-3 font-semibold text-gray-900">Email</th>
                <th className="p-3 font-semibold text-gray-900">Status</th>
                <th className="p-3 font-semibold text-gray-900">Last Activity</th>
                <th className="p-3 font-semibold text-gray-900">Follow-up Date</th>
                <th className="p-3 font-semibold text-gray-900 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCompanies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{c.companyName}</td>
                  <td className="p-3">{c.contactPerson || '-'}</td>
                  <td className="p-3">{c.email || '-'}</td>
                  <td className="p-3">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                      {c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3">{new Date(c.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-red-600 font-medium">
                    {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/companies/${c.id}`} className="text-blue-600 hover:underline font-medium">
                      View Profile →
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No assigned companies match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
