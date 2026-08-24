import sys
import re

path = 'frontend/app/companies/[id]/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(<option value="REJECTED">Rejected</option>\s*</select>\s*)<div className="flex gap-2 pt-2">',
    r'''\1{editData.status === 'CONFIRMED' && (
                    <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Amount Raised ($)</label>
                      <input type="number" name="amountRaised" value={editData.amountRaised || 0} onChange={e => setEditData({...editData, amountRaised: parseFloat(e.target.value)})} className="w-full border p-2 rounded text-sm bg-green-50 font-bold" placeholder="Amount Raised" />
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">''',
    content
)

content = re.sub(
    r'(<span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">\s*\{company\.status\}\s*</span>\s*</div>\s*)</div>',
    r'''<span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${company.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {company.status}
                      </span>
                    </div>
                    {company.status === 'CONFIRMED' && (
                      <div className="col-span-2 mt-2">
                         <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Amount Raised</p>
                         <p className="text-lg font-bold text-green-700">${company.amountRaised?.toLocaleString() || '0'}</p>
                      </div>
                    )}
                  </div>''',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace completed")
