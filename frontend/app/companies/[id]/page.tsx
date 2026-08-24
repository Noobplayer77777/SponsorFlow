'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../../lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    website: '',
    industry: '',
    location: '',
    status: '',
    lockedById: '',
    lockedAt: '',
  });
  
  const [composer, setComposer] = useState({
    subject: '',
    body: ''
  });
  
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCompanyAndTemplates = async () => {
      try {
        const [companyRes, templatesRes] = await Promise.all([
          api.get(`/companies/${params.id}`),
          api.get(`/templates`)
        ]);

        const data = companyRes.data;
        setFormData({
          companyName: data.companyName || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          website: data.website || '',
          industry: data.industry || '',
          location: data.location || '',
          status: data.status || 'NOT_ASSIGNED',
          lockedById: data.lockedById || '',
          lockedAt: data.lockedAt || '',
        });

        setTemplates(templatesRes.data || []);
      } catch (error) {
        alert('Failed to load data');
        router.push('/companies');
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyAndTemplates();
  }, [params.id, router]);

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{{company}}/g, formData.companyName || 'Company')
      .replace(/{{contact}}/g, formData.contactPerson || 'there')
      .replace(/{{event}}/g, 'our upcoming event')
      .replace(/{{member}}/g, user?.name || 'Sponsorship Team')
      .replace(/{{club}}/g, 'Hack Club')
      .replace(/{{website}}/g, formData.website || '');
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposer({
        subject: replacePlaceholders(template.subject),
        body: replacePlaceholders(template.body)
      });
    }
  };

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
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to acquire lock');
    }
  };

  const handleUnlock = async () => {
    try {
      await api.post(`/companies/${params.id}/unlock`, {});
      alert('Lock released.');
      window.location.reload();
    } catch (error: any) {
      alert('Failed to release lock');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to send this email via your Gmail account?')) return;
    
    setSending(true);
    try {
      // Use FormData since we might have files
      const payload = new FormData();
      payload.append('companyId', params.id as string);
      payload.append('subject', composer.subject);
      payload.append('body', composer.body);
      
      if (attachments) {
        for (let i = 0; i < attachments.length; i++) {
          payload.append('attachments', attachments[i]);
        }
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/gmail/send`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: payload
      });

      if (!res.ok) {
         const errorData = await res.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to send email');
      }

      alert('Email sent successfully via Gmail!');
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const [previewMode, setPreviewMode] = useState(false);

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const showComposer = (formData.lockedById === user?.id && formData.status === 'NOT_ASSIGNED') || formData.status === 'ASSIGNED';

  return (
    <div className="p-8 max-w-5xl mx-auto flex gap-8 items-start">
      
      {/* LEFT COL: COMPANY FORM */}
      <div className="flex-1 max-w-sm">
        <div className="flex items-center gap-4 mb-6 justify-between">
          <div className="flex items-center gap-4">
            <Link href="/companies" className="text-gray-500 hover:text-gray-900">← Back</Link>
            <h1 className="text-2xl font-bold">Company Details</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4 mb-8">
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
              <option value="EMAIL_SENT">Email Sent</option>
              <option value="REPLIED">Replied</option>
              <option value="INTERESTED">Interested</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700">
            Save Changes
          </button>
        </form>
      </div>

      {/* RIGHT COL: COMPOSER */}
      <div className="flex-1 min-w-[500px]">
        {/* Lock Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-4 border flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Email Outreach</h3>
            <p className="text-xs text-gray-500">
              {formData.status === 'EMAIL_SENT' ? 'Already contacted' : (formData.lockedById ? 'Currently Locked' : 'Unlocked')}
            </p>
          </div>
          {formData.status === 'NOT_ASSIGNED' && formData.lockedById !== user?.id && (
            <button type="button" onClick={handleLock} className="bg-orange-500 text-white px-3 py-1 rounded shadow hover:bg-orange-600 text-sm">
              Draft Email (Lock)
            </button>
          )}
          {formData.lockedById === user?.id && (
            <button type="button" onClick={handleUnlock} className="bg-gray-200 text-gray-800 px-3 py-1 rounded shadow hover:bg-gray-300 text-sm">
              Release Lock
            </button>
          )}
        </div>

        {/* Composer Form */}
        {showComposer && (
          <div className="bg-white p-6 rounded-lg shadow space-y-4 border-2 border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-blue-900">Email Composer</h2>
              <button 
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="text-sm bg-gray-100 px-3 py-1 rounded border hover:bg-gray-200"
              >
                {previewMode ? 'Edit Mode' : 'Preview Mode'}
              </button>
            </div>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              {!previewMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Load Template</label>
                  <select onChange={handleTemplateSelect} className="w-full border p-2 rounded bg-gray-50">
                    <option value="">-- Select a template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input disabled type="text" className="w-full border p-2 rounded bg-gray-100 text-gray-600" 
                  value={formData.email || 'No email provided for this company'} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                {previewMode ? (
                  <div className="p-2 border rounded bg-gray-50">{composer.subject}</div>
                ) : (
                  <input required type="text" className="w-full border p-2 rounded" 
                    value={composer.subject} onChange={e => setComposer({...composer, subject: e.target.value})} />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                {previewMode ? (
                  <div 
                    className="p-4 border rounded bg-white min-h-[300px] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: composer.body }} 
                  />
                ) : (
                  <textarea required rows={12} className="w-full border p-2 rounded font-sans text-sm" 
                    value={composer.body} onChange={e => setComposer({...composer, body: e.target.value})} />
                )}
              </div>

              {!previewMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Sponsorship Deck, etc.)</label>
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef}
                    onChange={(e) => setAttachments(e.target.files)}
                    className="w-full border p-2 rounded text-sm bg-gray-50" 
                  />
                </div>
              )}

              <div className="pt-2 border-t flex gap-2">
                <button disabled={sending || !formData.email} type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {sending ? 'Sending via Gmail...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
