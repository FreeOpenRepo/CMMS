import { Asset, Technician, SparePart, WorkOrder, DashboardStats, WorkOrderPriority } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5020';

export async function fetchAssets(): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/api/assets`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchAssetById(id: number): Promise<Asset> {
  const res = await fetch(`${API_BASE}/api/assets/${id}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const res = await fetch(`${API_BASE}/api/workorders`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function createWorkOrder(payload: {
  assetId: number;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  requesterName: string;
  beforePhotoUrl?: string;
}): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE}/api/workorders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Work order creation failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function assignTechnician(workOrderId: number, technicianId: number): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE}/api/workorders/${workOrderId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technicianId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Assignment failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function startRepair(workOrderId: number): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE}/api/workorders/${workOrderId}/start`, {
    method: 'POST'
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Starting repair failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function completeRepair(workOrderId: number, payload: {
  afterPhotoUrl: string;
  technicianNotes?: string;
  laborHours: number;
  usedParts?: { sparePartId: number; quantity: number }[];
}): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE}/api/workorders/${workOrderId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Completing work order failed' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export async function fetchTechnicians(): Promise<Technician[]> {
  const res = await fetch(`${API_BASE}/api/technicians`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchSpareParts(): Promise<SparePart[]> {
  const res = await fetch(`${API_BASE}/api/spare-parts`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function restockSparePart(id: number, quantity: number): Promise<SparePart> {
  const res = await fetch(`${API_BASE}/api/spare-parts/${id}/restock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  });

  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/dashboard/stats`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}
