namespace cmms_api.Models;

public class Asset
{
    public int Id { get; set; }
    public string AssetTag { get; set; } = string.Empty; // e.g. AST-PUMP-01
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // e.g. Hydraulics, HVAC, CNC Machine
    public string Location { get; set; } = string.Empty; // e.g. Factory Floor Line 2
    public AssetStatus Status { get; set; } = AssetStatus.Operational;
    public string Manufacturer { get; set; } = string.Empty;
    public string ModelNumber { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public DateTime InstallDate { get; set; } = DateTime.UtcNow.AddYears(-2);
    public string? QrCodeBase64 { get; set; }
    public DateTime LastMaintainedAt { get; set; } = DateTime.UtcNow.AddMonths(-1);
}

public class Technician
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Specialty { get; set; } = "Mechanical"; // Mechanical, Electrical, HVAC, Robotics
    public string Phone { get; set; } = string.Empty;
    public decimal HourlyRate { get; set; } = 450.0m;
    public bool IsAvailable { get; set; } = true;
}

public class SparePart
{
    public int Id { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public int CurrentStock { get; set; }
    public int MinimumThreshold { get; set; } = 5;
    public decimal UnitCost { get; set; }
    public string Unit { get; set; } = "pcs";
}

public class WorkOrderPart
{
    public int Id { get; set; }
    public int WorkOrderId { get; set; }
    public int SparePartId { get; set; }
    public string PartNumber { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public int QuantityUsed { get; set; }
    public decimal UnitCost { get; set; }
    public decimal TotalCost => QuantityUsed * UnitCost;
}

public class WorkOrder
{
    public int Id { get; set; }
    public string WorkOrderNumber { get; set; } = string.Empty;
    
    // Invariant: WorkOrderMustLinkToValidAsset
    public int AssetId { get; set; }
    public string AssetTag { get; set; } = string.Empty;
    public string AssetName { get; set; } = string.Empty;
    public string AssetLocation { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;
    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.OPEN;
    
    public string RequesterName { get; set; } = "Operator";
    public int? AssignedTechnicianId { get; set; }
    public string? AssignedTechnicianName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AssignedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Coravel 4-Hour SLA Watchdog
    public DateTime? SlaDueAt { get; set; }
    public bool SlaBreached { get; set; } = false;

    // Photos
    public string? BeforePhotoUrl { get; set; }
    // Invariant: AfterPhotoMandatoryForResolution
    public string? AfterPhotoUrl { get; set; }

    public string? TechnicianNotes { get; set; }
    public decimal LaborHours { get; set; } = 0m;
    public decimal LaborCost { get; set; } = 0m;
    public decimal PartsCost => Parts.Sum(p => p.TotalCost);
    public decimal TotalCost => LaborCost + PartsCost;

    public List<WorkOrderPart> Parts { get; set; } = new();
}
