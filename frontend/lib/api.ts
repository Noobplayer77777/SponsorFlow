const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  async get(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  
  async post(endpoint: string, data: any, isFormData: boolean = false) {
    const headers = getHeaders();
    if (isFormData) {
      delete headers['Content-Type']; // Let browser set multipart/form-data with boundary
    }
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
    if (!res.ok) {
       const err = await res.json().catch(() => ({}));
       throw new Error(err.message || 'API Error');
    }
    return res.json();
  },

  async put(endpoint: string, data: any) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async delete(endpoint: string) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  async upload(endpoint: string, file: File) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw errorData;
    }
    return res.json();
  }
};
