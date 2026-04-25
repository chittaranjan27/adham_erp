import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "";

class ApiError extends Error {
  data: any;
  status: number;
  constructor(message: string, data: any, status: number) {
    super(message);
    this.data = data;
    this.status = status;
  }
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem("adhams_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.error ?? "Request failed", err, res.status);
  }
  return res.json();
}

// ─── Purchase Orders ─────────────────────────────────────────────
export function useListPurchaseOrders(params?: { type?: string; page?: number }) {
  return useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.type) q.set("type", params.type);
      if (params?.page) q.set("page", String(params.page));
      return apiFetch<any>(`/api/purchase-orders?${q}`);
    },
  });
}

export function useGetPurchaseOrder(id: number | undefined) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => apiFetch<any>(`/api/purchase-orders/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/api/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch<any>(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/api/purchase-orders/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

// ─── GRN ──────────────────────────────────────────────────────────
export function useListGrn(params?: { page?: number }) {
  return useQuery({
    queryKey: ["grn", params],
    queryFn: () => {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      return apiFetch<any>(`/api/grn?${q}`);
    },
  });
}

export function useUpdateGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch<any>(`/api/grn/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grn"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); },
  });
}

export function useCreateGrn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/api/grn", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["grn"] }); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });
}

// ─── Warehouses ───────────────────────────────────────────────────
export function useListWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<any[]>("/api/warehouses"),
  });
}

// ─── Import Workflow ──────────────────────────────────────────────
export function useGetImportWorkflow(poId: number | undefined) {
  return useQuery({
    queryKey: ["import-workflow", poId],
    queryFn: () => apiFetch<any>(`/api/import-workflow/${poId}`),
    enabled: !!poId,
  });
}

export function useAdvanceImportStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, stageId, data }: { poId: number; stageId: number; data: any }) =>
      apiFetch<any>(`/api/import-workflow/${poId}/stage/${stageId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, { poId }) => { qc.invalidateQueries({ queryKey: ["import-workflow", poId] }); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
  });
}

// ─── Warehouse Locations ──────────────────────────────────────────
export function useListWarehouseLocations(warehouseId?: number) {
  return useQuery({
    queryKey: ["warehouse-locations", warehouseId],
    queryFn: () => {
      const q = new URLSearchParams();
      if (warehouseId) q.set("warehouse_id", String(warehouseId));
      return apiFetch<any>(`/api/warehouse-locations?${q}`);
    },
  });
}

export function useCreateWarehouseLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/api/warehouse-locations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["warehouse-locations"] }),
  });
}
