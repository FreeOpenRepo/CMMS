namespace cmms_api.Models;

public enum WorkOrderStatus
{
    OPEN,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED,
    CLOSED
}

public enum WorkOrderPriority
{
    Low,
    Medium,
    High,
    Critical
}

public enum AssetStatus
{
    Operational,
    Degraded,
    Down,
    UnderMaintenance
}

public enum ActorRole
{
    Requester,
    MaintenanceLead,
    Technician,
    CoravelScheduler
}
