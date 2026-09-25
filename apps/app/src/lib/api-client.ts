import type { Company, FieldType, FormField, Site, Submission } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://entrywise.webbound.in/v1';

class ApiService {
  private token: string | null = null;

  setAuthToken(token: string | null) {
    this.token = token;
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Workspaces (Companies)
  async listCompanies(): Promise<Company[]> {
    const res = await fetch(`${API_BASE}/companies`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to fetch workspaces (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.items || json.data || [];
  }

  async createCompany(data: {
    name: string;
    email_provider?: string;
    from_email?: string;
    from_name?: string;
  }): Promise<Company> {
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to create workspace (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to update workspace (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteCompany(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to delete workspace (HTTP ${res.status})`
      );
    }
  }

  // Sites (Forms)
  async listSites(companyId?: string): Promise<Site[]> {
    const url = companyId
      ? `${API_BASE}/sites?company_id=${encodeURIComponent(companyId)}`
      : `${API_BASE}/sites`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to fetch sites (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.items || json.data || [];
  }

  async createSite(site: {
    domain: string;
    name?: string;
    admin_email?: string;
    notification_emails?: string;
    timezone?: string;
    company_id?: string;
    [key: string]: unknown;
  }): Promise<Site> {
    const res = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(site),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to create site (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json;
  }

  async updateSite(siteId: string, updates: Partial<Site>): Promise<Site> {
    const res = await fetch(`${API_BASE}/sites/${siteId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to update site (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteSite(siteId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to delete site (HTTP ${res.status})`);
    }
  }

  // Form Fields
  async listFields(siteId: string): Promise<FormField[]> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/fields`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to fetch fields (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json || [];
  }

  async replaceFields(
    siteId: string,
    fields: Array<{ name: string; type: FieldType }>
  ): Promise<FormField[]> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/fields`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to update fields (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json || [];
  }

  async createField(siteId: string, field: { name: string; type: FieldType }): Promise<FormField> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/fields`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(field),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to create field (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteField(siteId: string, fieldId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/fields/${fieldId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to delete field (HTTP ${res.status})`);
    }
  }

  // Submissions
  async listSubmissions(
    siteId: string,
    options: { status?: string; limit?: number; offset?: number; search?: string } = {}
  ): Promise<{ data: Submission[]; total: number }> {
    const params = new URLSearchParams();
    if (options.status && options.status !== 'all') params.set('status', options.status);
    if (options.search) params.set('query', options.search);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.offset) params.set('offset', options.offset.toString());

    const res = await fetch(`${API_BASE}/sites/${siteId}/submissions?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to fetch submissions (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return {
      data: json.items || json.data || [],
      total: json.total_count ?? json.meta?.total ?? json.items?.length ?? json.data?.length ?? 0,
    };
  }

  async patchSubmissionStatus(
    siteId: string,
    submissionId: string,
    status: 'new' | 'read' | 'archived' | 'spam'
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to update submission status (HTTP ${res.status})`
      );
    }
  }

  async deleteSubmission(siteId: string, submissionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to delete submission (HTTP ${res.status})`
      );
    }
  }

  getExportUrl(siteId: string): string {
    return `${API_BASE}/sites/${siteId}/submissions/export`;
  }
}

export const api = new ApiService();
