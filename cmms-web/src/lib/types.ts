export type WorkOrderStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type AssetStatus = 'Operational' | 'Degraded' | 'Down' | 'UnderMaintenance';
export type ActorRole = 'Requester' | 'MaintenanceLead' | 'Technician' | 'CoravelScheduler';

export interface Asset {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  location: string;
  status: number | AssetStatus;
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  installDate: string;
  qrCodeBase64?: string;
  lastMaintainedAt: string;
}

export interface Technician {
  id: number;
  name: string;
  specialty: string;
  phone: string;
  hourlyRate: number;
  isAvailable: boolean;
}

export interface SparePart {
  id: number;
  partNumber: string;
  name: string;
  category: string;
  currentStock: number;
  minimumThreshold: number;
  unitCost: number;
  unit: string;
}

export interface WorkOrderPart {
  id?: number;
  workOrderId?: number;
  sparePartId: number;
  partNumber: string;
  partName: string;
  quantityUsed: number;
  unitCost: number;
  totalCost?: number;
}

export interface WorkOrder {
  id: number;
  workOrderNumber: string;
  assetId: number;
  assetTag: string;
  assetName: string;
  assetLocation: string;
  title: string;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  requesterName: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  slaDueAt?: string;
  slaBreached: boolean;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  technicianNotes?: string;
  laborHours: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  parts: WorkOrderPart[];
}

export interface DashboardStats {
  totalAssets: number;
  operationalAssets: number;
  uptimePercentage: number;
  activeWos: number;
  resolvedWos: number;
  breachedSlas: number;
  totalMaintenanceCost: number;
}
