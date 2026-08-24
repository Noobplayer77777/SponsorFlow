import sys
import re

path = 'frontend/app/companies/[id]/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add State
content = content.replace(
    "const [submittingFollowUp, setSubmittingFollowUp] = useState(false);",
    """const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [generatingIntro, setGeneratingIntro] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [suggestingReplyFor, setSuggestingReplyFor] = useState<string | null>(null);
  const [suggestedReply, setSuggestedReply] = useState('');"""
)

# 2. Add AI Handler functions
handlers = """  const handleGenerateIntro = async () => {
    if (!company) return;
    setGeneratingIntro(true);
    try {
      const res = await api.post('/ai/personalize', { companyId: company.id });
      if (res.data?.sentence) {
        setBody(prev => (prev ? res.data.sentence + '\\n\\n' + prev : res.data.sentence));
      }
    } catch (e) {
      alert('Failed to generate intro.');
    } finally {
      setGeneratingIntro(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!company) return;
    setGeneratingSummary(true);
    try {
      const res = await api.post('/ai/summary', { companyId: company.id });
      if (res.data?.summary) {
        setCompany({ ...company, aiSummary: res.data.summary });
      }
    } catch (e) {
      alert('Failed to generate summary.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSuggestReply = async (replyId: string, replyContent: string) => {
    setSuggestingReplyFor(replyId);
    setSuggestedReply('');
    try {
      // Find earlier context if possible (just pass thread if available, or just the content)
      const res = await api.post('/ai/reply', { emailThread: '', latestReply: replyContent });
      if (res.data?.suggestion) {
        setSuggestedReply(res.data.suggestion);
      }
    } catch (e) {
      alert('Failed to generate reply suggestion.');
      setSuggestingReplyFor(null);
    }
  };

  const acceptSuggestedReply = () => {
    setBody(suggestedReply);
    setSubject(`Re: ${company.companyName} Sponsorship`);
    setSuggestingReplyFor(null);
    setSuggestedReply('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
"""

content = content.replace(
    "const handleScheduleFollowUp = async (e: React.FormEvent) => {",
    handlers + "\n  const handleScheduleFollowUp = async (e: React.FormEvent) => {"
)

# 3. Add UI: ✨ Generate AI Intro button
content = content.replace(
    '<textarea className="w-full border p-2 rounded text-sm min-h-[200px]" value={body}',
    """<div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Body</label>
                  <button type="button" onClick={handleGenerateIntro} disabled={generatingIntro} className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                    ✨ {generatingIntro ? 'Generating...' : 'AI Intro'}
                  </button>
                </div>
                <textarea className="w-full border p-2 rounded text-sm min-h-[200px]" value={body}"""
)

# 4. Add UI: AI Company Summary Card
summary_card = """
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl shadow-sm border border-purple-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-purple-900 text-lg flex items-center gap-2">✨ AI Intelligence</h3>
                {!company.aiSummary && (
                  <button onClick={handleGenerateSummary} disabled={generatingSummary} className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50">
                    {generatingSummary ? 'Analyzing...' : 'Generate Summary'}
                  </button>
                )}
              </div>
              {company.aiSummary ? (
                <div className="prose prose-sm prose-purple max-w-none text-gray-800 whitespace-pre-wrap">
                  {company.aiSummary}
                </div>
              ) : (
                <p className="text-sm text-purple-700/60 italic">No summary generated yet. Click generate to analyze company data.</p>
              )}
            </div>
"""

content = content.replace(
    '<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">',
    summary_card + '\n            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">',
    1 # Only replace the first occurrence (which is the Activities timeline, placing it above it)
)

# 5. Add UI: Suggest Reply button inside Replies map
reply_ui = """<p className="text-xs text-gray-500 mt-1">{new Date(reply.createdAt).toLocaleString()}</p>
                    <button onClick={() => handleSuggestReply(reply.id, reply.content)} className="mt-2 text-xs text-purple-600 font-medium hover:underline flex items-center gap-1">
                      ✨ Suggest AI Reply
                    </button>
                    {suggestingReplyFor === reply.id && (
                      <div className="mt-3 p-3 bg-white border border-purple-200 rounded text-sm">
                        {suggestedReply ? (
                          <>
                            <textarea 
                              className="w-full border-gray-200 rounded p-2 text-sm mb-2" 
                              rows={4} 
                              value={suggestedReply} 
                              onChange={e => setSuggestedReply(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button onClick={acceptSuggestedReply} className="bg-purple-600 text-white px-3 py-1 rounded text-xs">Accept & Reply</button>
                              <button onClick={() => { setSuggestingReplyFor(null); setSuggestedReply(''); }} className="text-gray-500 px-3 py-1 text-xs hover:underline">Cancel</button>
                            </div>
                          </>
                        ) : (
                          <span className="text-purple-600 animate-pulse">Generating response...</span>
                        )}
                      </div>
                    )}"""

content = content.replace(
    '<p className="text-xs text-gray-500 mt-1">{new Date(reply.createdAt).toLocaleString()}</p>',
    reply_ui
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected AI UI")
