const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

export interface Supplier {
  id: number;
  name: string;
  description: string;
  base_urls: string[];
  docs_url: string;
  workbench_url: string;
  codex_template: string;
  claude_template: string;
  available_models: string[];
  default_model: string;
  created_at: string;
  updated_at: string;
  key_count: number;
  healthy_key_count: number;
}

export interface ApiKey {
  id: number;
  supplier_id: number;
  api_key: string;
  base_url: string;
  expire_at: string | null;
  remaining: number;
  status: string;
  last_tested_at: string | null;
  test_latency_ms: number | null;
  test_error: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface HealthTestResult {
  key_id: number;
  api_key_mask: string;
  status: string;
  latency_ms: number | null;
  error: string | null;
  model_tested: string;
}

export interface HealthTestResponse {
  results: HealthTestResult[];
  total: number;
  healthy: number;
  unhealthy: number;
  frequent: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Suppliers
  listSuppliers: () => request<Supplier[]>("/suppliers"),
  getSupplier: (id: number) => request<Supplier>(`/suppliers/${id}`),
  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: Partial<Supplier>) =>
    request<Supplier>(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (id: number) =>
    request<{ ok: boolean }>(`/suppliers/${id}`, { method: "DELETE" }),

  // Keys
  listKeys: (supplierId?: number, status?: string) => {
    const params = new URLSearchParams();
    if (supplierId) params.set("supplier_id", String(supplierId));
    if (status) params.set("status", status);
    return request<ApiKey[]>(`/keys?${params}`);
  },
  getKey: (id: number) => request<ApiKey>(`/keys/${id}`),
  createKey: (data: Partial<ApiKey> & { supplier_id: number; api_key: string; base_url: string }) =>
    request<ApiKey>("/keys", { method: "POST", body: JSON.stringify(data) }),
  updateKey: (id: number, data: Partial<ApiKey>) =>
    request<ApiKey>(`/keys/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteKey: (id: number) =>
    request<{ ok: boolean }>(`/keys/${id}`, { method: "DELETE" }),
  batchDeleteKeys: (keyIds: number[]) =>
    request<{ ok: boolean; deleted_count: number }>("/keys/batch-delete", {
      method: "POST",
      body: JSON.stringify({ key_ids: keyIds }),
    }),

  // Health Test
  healthTest: (data: { supplier_id: number; key_ids?: number[]; models?: string[] }) =>
    request<HealthTestResponse>("/health-test", { method: "POST", body: JSON.stringify(data) }),

  // Seed
  seed: () => request<{ message: string; supplier_id: number }>("/seed", { method: "POST" }),
};
