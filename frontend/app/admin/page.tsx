'use client';

import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    industry: '',
    status: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      const u = JSON.parse(storedUser);
      if (u.role !== 'ADMIN') {
        router.push('/member');
        return;
      }
      setUser(u);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.industry) queryParams.append('industry', filters.industry);
      if (filters.status) queryParams.append('status', filters.status);

      const res = await api.get(`/analytics/dashboard?${queryParams.toString()}`);
      setStats(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <nav className="flex gap-4">
            <Link href="/companies" className="text-blue-600 hover:underline">Manage Companies</Link>
            <Link href="/admin/templates" className="text-blue-600 hover:underline">Manage Templates</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* FILTERS */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="border p-2 rounded text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="border p-2 rounded text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Industry</label>
            <input type="text" name="industry" placeholder="e.g. Technology" value={filters.industry} onChange={handleFilterChange} className="border p-2 rounded text-sm bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange} className="border p-2 rounded text-sm bg-gray-50">
              <option value="">All</option>
              <option value="NOT_ASSIGNED">Not Assigned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EMAIL_SENT">Email Sent</option>
              <option value="REPLIED">Replied</option>
              <option value="CONFIRMED">Confirmed</option>
            </select>
          </div>
          <button onClick={() => setFilters({startDate: '', endDate: '', industry: '', status: ''})} className="text-sm text-gray-500 hover:underline mb-2">
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading analytics...</div>
        ) : !stats ? (
          <div className="text-center text-gray-500 py-10">No data available</div>
        ) : (
          <>
            {/* TOP CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-sm text-gray-500 font-medium">Total Companies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
                <p className="text-xs text-gray-400">{stats.assignedCompanies} Assigned</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500">
                <p className="text-sm text-gray-500 font-medium">Emails Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.emailsSent}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-sm text-gray-500 font-medium">Replies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.replies}</p>
                <p className="text-xs text-green-600 font-medium">Rate: {stats.replyRate}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
                <p className="text-sm text-gray-500 font-medium">Sponsors Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sponsorsConfirmed}</p>
                <p className="text-xs text-gray-400">${stats.totalSponsorshipRaised.toLocaleString()} Raised</p>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Member Performance Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Member Performance (Emails vs Replies/Confirmed)</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.memberPerformance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f3f4f6'}} />
                      <Legend />
                      <Bar dataKey="emailsSent" name="Emails Sent" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="confirmed" name="Confirmed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Industry Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Industry Response</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.industryStats.filter((i: any) => i.total > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        nameKey="industry"
                        label={({ name, percent }: any) => ` %`}
                      >
                        {stats.industryStats.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* MEMBER TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Detailed Member Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-6 py-3 font-medium">Member Name</th>
                      <th className="px-6 py-3 font-medium">Assigned</th>
                      <th className="px-6 py-3 font-medium">Emails Sent</th>
                      <th className="px-6 py-3 font-medium">Confirmed Sponsors</th>
                      <th className="px-6 py-3 font-medium">Amount Raised</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.memberPerformance.map((member: any) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{member.name}</td>
                        <td className="px-6 py-4">{member.assigned}</td>
                        <td className="px-6 py-4">{member.emailsSent}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {member.confirmed}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">${member.raised.toLocaleString()}</td>
                      </tr>
                    ))}
                    {stats.memberPerformance.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No members found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
