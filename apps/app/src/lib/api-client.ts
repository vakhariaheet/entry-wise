import type { Company, FieldType, FormField, Site, Submission, Webhook } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'https://entrywise.webbound.in/v1';

class ApiService {
  private token: string | null = null;
  // A provider (e.g. Clerk's getToken) that returns a FRESH token on demand. Clerk session JWTs
  // expire ~60s, so caching a single token on a long-lived page made later requests 401. When a
  // provider is set we refresh the token on every request.
  private tokenProvider: (() => Promise<string | null>) | null = null;

  setAuthToken(token: string | null) {
    this.token = token;
  }

  setTokenProvider(provider: (() => Promise<string | null>) | null) {
    this.tokenProvider = provider;
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.tokenProvider) {
      try {
        const fresh = await this.tokenProvider();
        if (fresh) this.token = fresh;
      } catch {
        // fall back to the cached token if the provider fails
      }
    }
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to delete workspace (HTTP ${res.status})`
      );
    }
  }

  async testCompanyEmail(
    id: string,
    recipientEmail?: string
  ): Promise<{ success: boolean; message: string; provider?: string }> {
    const res = await fetch(`${API_BASE}/companies/${id}/test-email`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ recipient_email: recipientEmail }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to send test email (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  // Sites (Forms)
  async listSites(companyId?: string): Promise<Site[]> {
    const url = companyId
      ? `${API_BASE}/sites?company_id=${encodeURIComponent(companyId)}`
      : `${API_BASE}/sites`;
    const res = await fetch(url, {
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to delete site (HTTP ${res.status})`);
    }
  }

  async testSiteEmail(
    id: string,
    payload: {
      recipient_email: string;
      template_type?: 'auto_responder' | 'submission_alert';
      custom_subject?: string;
      custom_html?: string;
    }
  ): Promise<{ success: boolean; message: string; recipient: string; template_type: string }> {
    const res = await fetch(`${API_BASE}/sites/${id}/test-email`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to send test email (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  // Form Fields
  async listFields(siteId: string): Promise<FormField[]> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/fields`, {
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
      headers: await this.getAuthHeaders(),
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
    await this.patchSubmission(siteId, submissionId, { status });
  }

  async patchSubmission(
    siteId: string,
    submissionId: string,
    updates: { status?: 'new' | 'read' | 'archived' | 'spam'; notes?: string | null }
  ): Promise<Submission> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to update submission (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  async testSubmission(
    siteId: string,
    payload?: { fields?: Record<string, string>; dispatch_connectors?: boolean }
  ): Promise<{
    success: boolean;
    submission_id: string;
    dispatched: boolean;
    latency_ms: number;
    test_data: Record<string, string>;
    pipeline: Record<string, any>;
  }> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/test-submission`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to run test submission (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  async clearTestSubmissions(siteId: string): Promise<{ success: boolean; deleted_count: number }> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/test-submissions`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to clear test submissions (HTTP ${res.status})`
      );
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteSubmission(siteId: string, submissionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
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

  /**
   * Downloads the submissions export with the auth header attached and saves it client-side.
   * (Previously the UI did `window.open(exportUrl)`, which can't send Authorization and returned 401.)
   */
  async downloadSubmissionsExport(
    siteId: string,
    options: { format?: 'csv' | 'json'; status?: string; includeTest?: boolean } = {}
  ): Promise<void> {
    const format = options.format || 'csv';
    const params = new URLSearchParams({ format });
    if (options.status && options.status !== 'all') params.set('status', options.status);
    if (options.includeTest) params.set('include_test', '1');

    const res = await fetch(
      `${API_BASE}/sites/${siteId}/submissions/export?${params.toString()}`,
      { headers: await this.getAuthHeaders() }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.detail || err.message || `Failed to export submissions (HTTP ${res.status})`
      );
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submissions-${siteId}-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Webhooks
  async listWebhooks(siteId: string): Promise<Webhook[]> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/webhooks`, {
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to fetch webhooks (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.items || json.data || [];
  }

  async createWebhook(
    siteId: string,
    data: { name: string; url: string; secret?: string | null; enabled?: boolean }
  ): Promise<Webhook> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/webhooks`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to create webhook (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json;
  }

  async updateWebhook(
    siteId: string,
    webhookId: string,
    data: Partial<{ name: string; url: string; secret?: string | null; enabled?: boolean }>
  ): Promise<Webhook> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/webhooks/${webhookId}`, {
      method: 'PATCH',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to update webhook (HTTP ${res.status})`);
    }
    const json = await res.json();
    return json.data || json;
  }

  async deleteWebhook(siteId: string, webhookId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Failed to delete webhook (HTTP ${res.status})`);
    }
  }

  async testWebhook(
    siteId: string,
    webhookId: string
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    const res = await fetch(`${API_BASE}/sites/${siteId}/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.detail || err.message || `Test failed with HTTP ${res.status}`,
      };
    }
    const json = await res.json();
    return json.data || json;
  }
}

export const api = new ApiService();
