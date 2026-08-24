'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../../lib/api';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [company, setCompany] = useState<any>({});
  
  const [composer, setComposer] = useState({ subject: '', body: '' });
  const [attachments, setAttachments] = useState<FileList | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  useEffect(() => {
    const fetchCompanyAndTemplates = async () => {
      try {
        const [companyRes, templatesRes] = await Promise.all([
          api.get(`/companies/${params.id}`),
          api.get(`/templates`)
        ]);
        setCompany(companyRes.data);
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
      .replace(/{{company}}/g, company.companyName || 'Company')
      .replace(/{{contact}}/g, company.contactPerson || 'there')
      .replace(/{{event}}/g, 'our upcoming event')
      .replace(/{{member}}/g, user?.name || 'Sponsorship Team')
      .replace(/{{club}}/g, 'Hack Club')
      .replace(/{{website}}/g, company.website || '');
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    setSubmittingNote(true);
    try {
      await api.post(`/companies/${params.id}/notes`, { content: newNote });
      setNewNote('');
      const companyRes = await api.get(`/companies/${params.id}`);
      setCompany(companyRes.data);
    } catch (error) {
      alert('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;

    setSubmittingFollowUp(true);
    try {
      await api.post(`/companies/${params.id}/follow-ups`, {
        date: new Date(followUpDate).toISOString(),
        note: followUpNote
      });
      setFollowUpDate('');
      setFollowUpNote('');
      alert('Follow-up scheduled successfully!');
      const companyRes = await api.get(`/companies/${params.id}`);
      setCompany(companyRes.data);
    } catch (error: any) {
      alert(error.message || 'Failed to schedule follow-up');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Profile...</div>;

  const showComposer = (company.lockedById === user?.id && company.status === 'NOT_ASSIGNED') || company.status === 'ASSIGNED';

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-6 bg-gray-50 min-h-screen">
      
      {/* LEFT COL: PROFILE DATA */}
      <div className="w-[400px] space-y-6">
        
        {/* Header / Identity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <Link href={user?.role === 'ADMIN' ? '/companies' : '/member'} className="text-gray-400 hover:text-gray-900">← Back</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.companyName}</h1>
          <p className="text-sm text-gray-500 mb-4">{company.industry || 'Unknown Industry'} • {company.location || 'Unknown Location'}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
              {company.status.replace('_', ' ')}
            </span>
          </div>

          <div className="text-sm space-y-3 text-gray-700">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 w-24">Contact:</span> 
              <span>{company.contactPerson || '-'} ({company.designation || '-'})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 w-24">Email:</span> 
              <span className="text-blue-600 truncate">{company.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 w-24">Phone:</span> 
              <span>{company.phoneNumber || '-'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 w-24">Website:</span> 
              {company.website ? <a href={company.website} target="_blank" className="text-blue-600 hover:underline">Link</a> : '-'}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 w-24">LinkedIn:</span> 
              {company.linkedin ? <a href={company.linkedin} target="_blank" className="text-blue-600 hover:underline">Link</a> : '-'}
            </div>
          </div>
        </div>

        {/* Assignments & Logistics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-lg">Logistics</h3>
          <div className="text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Assigned Member</span>
              <span className="font-medium text-gray-900">{company.assignment?.user?.name || 'Unassigned'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Follow-up Due</span>
              <span className="font-medium text-red-600">{company.followUpDate ? new Date(company.followUpDate).toLocaleDateString() : 'Not Set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Last Activity</span>
              <span className="font-medium text-gray-900">{new Date(company.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Attachments Placeholder */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60">
          <h3 className="font-bold text-gray-900 mb-2 text-lg">Attachments</h3>
          <p className="text-xs text-gray-500 mb-3">Stored sponsorship documents and assets</p>
          <div className="text-sm bg-gray-50 p-3 rounded border border-dashed border-gray-300 text-center text-gray-400">
            No attachments yet
          </div>
        </div>

      </div>

      {/* RIGHT COL: WORKSPACE */}
      <div className="flex-1 space-y-6">
        
        {/* Composer / Outreach Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Email Outreach</h2>
              <p className="text-xs text-gray-500 mt-1">
                {company.status === 'EMAIL_SENT' ? 'Already contacted' : (company.lockedById ? 'Currently Locked' : 'Unlocked')}
              </p>
            </div>
            <div className="flex gap-2">
              {company.status === 'NOT_ASSIGNED' && company.lockedById !== user?.id && (
                <button type="button" onClick={handleLock} className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-orange-600 text-sm font-medium transition">
                  Acquire Lock & Draft
                </button>
              )}
              {company.lockedById === user?.id && (
                <button type="button" onClick={handleUnlock} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow-sm border hover:bg-gray-200 text-sm font-medium transition">
                  Release Lock
                </button>
              )}
            </div>
          </div>

          {showComposer ? (
            <div className="bg-blue-50/50 p-6 rounded-lg border border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-blue-900">Draft Initial Email</h3>
                <button 
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="text-xs bg-white px-3 py-1 rounded shadow-sm border border-gray-200 hover:bg-gray-50 font-medium"
                >
                  {previewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
              </div>
              
              <form onSubmit={handleSendEmail} className="space-y-4">
                {!previewMode && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Load Template</label>
                    <select onChange={handleTemplateSelect} className="w-full border-gray-300 border p-2.5 rounded-lg bg-white text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500">
                      <option value="">-- Start from scratch or select a template --</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">To</label>
                  <input disabled type="text" className="w-full border p-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm border-gray-300" 
                    value={company.email || 'No email provided for this company'} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Subject</label>
                  {previewMode ? (
                    <div className="p-3 border border-gray-200 rounded-lg bg-white text-sm shadow-sm">{composer.subject}</div>
                  ) : (
                    <input required type="text" className="w-full border border-gray-300 p-2.5 rounded-lg text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={composer.subject} onChange={e => setComposer({...composer, subject: e.target.value})} />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Message (HTML)</label>
                  {previewMode ? (
                    <div 
                      className="p-4 border border-gray-200 rounded-lg bg-white min-h-[300px] prose prose-sm max-w-none shadow-sm"
                      dangerouslySetInnerHTML={{ __html: composer.body }} 
                    />
                  ) : (
                    <textarea required rows={12} className="w-full border border-gray-300 p-3 rounded-lg font-sans text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={composer.body} onChange={e => setComposer({...composer, body: e.target.value})} />
                  )}
                </div>

                {!previewMode && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Attachments</label>
                    <input 
                      type="file" 
                      multiple 
                      ref={fileInputRef}
                      onChange={(e) => setAttachments(e.target.files)}
                      className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <button disabled={sending || !company.email} type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition">
                    {sending ? 'Sending via Gmail API...' : 'Send Initial Outreach Email'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
             <div className="text-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
               <p className="text-gray-500 text-sm">No active composer session.</p>
               <p className="text-gray-400 text-xs mt-1">Acquire the lock or assign the company to begin drafting.</p>
             </div>
          )}
        </div>

        {/* Timelines and Placeholders */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 text-lg border-b pb-2">Activity Timeline</h3>
            <div className="space-y-4 relative pl-4 border-l-2 border-gray-200 text-sm text-gray-600 max-h-96 overflow-y-auto">
              {company.activities?.length > 0 ? company.activities.map((act: any) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                  <p className="font-medium text-gray-900">{act.type.replace(/_/g, ' ')}</p>
                  <p className="text-gray-700">{act.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(act.createdAt).toLocaleString()} {act.user ? `· ${act.user.name}` : ''}</p>
                </div>
              )) : (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-3 h-3 bg-gray-300 rounded-full border-2 border-white"></div>
                  <p className="font-medium text-gray-900">Company Created</p>
                  <p className="text-xs">{new Date(company.createdAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 flex flex-col">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-900 mb-2 text-lg border-b pb-2">Internal Notes</h3>
              
              <div className="flex-1 max-h-48 overflow-y-auto space-y-3 mb-4">
                {company.notes?.length > 0 ? company.notes.map((note: any) => (
                  <div key={note.id} className="bg-yellow-50 p-3 rounded text-sm border border-yellow-100">
                    <p className="text-gray-800">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{note.author?.name} · {new Date(note.createdAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 italic">No notes added yet.</p>
                )}
              </div>

              <form onSubmit={handleAddNote} className="mt-auto pt-2 border-t">
                <input 
                  type="text" 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Type a note and press enter..."
                  className="w-full border p-2 rounded text-sm shadow-inner bg-gray-50 focus:bg-white"
                  disabled={submittingNote}
                />
              </form>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2 text-lg border-b pb-2">Replies Received</h3>
              <div className="max-h-48 overflow-y-auto space-y-3 mb-4">
                {company.replies?.length > 0 ? company.replies.map((reply: any) => (
                  <div key={reply.id} className="bg-green-50 p-3 rounded text-sm border border-green-100">
                    <p className="font-semibold text-green-900">{reply.sender}</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{reply.content}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(reply.createdAt).toLocaleString()}</p>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 italic">Awaiting sponsor reply...</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2 text-lg border-b pb-2">Schedule Follow-up</h3>
              <form onSubmit={handleScheduleFollowUp} className="space-y-3 mt-3">
                <input 
                  type="datetime-local" 
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full border p-2 rounded text-sm shadow-inner bg-gray-50 focus:bg-white"
                  required
                  disabled={submittingFollowUp}
                />
                <input 
                  type="text" 
                  value={followUpNote}
                  onChange={e => setFollowUpNote(e.target.value)}
                  placeholder="Optional reminder note..."
                  className="w-full border p-2 rounded text-sm shadow-inner bg-gray-50 focus:bg-white"
                  disabled={submittingFollowUp}
                />
                <button 
                  type="submit" 
                  disabled={submittingFollowUp || !followUpDate}
                  className="w-full bg-blue-600 text-white py-2 rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  Schedule Notification
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
