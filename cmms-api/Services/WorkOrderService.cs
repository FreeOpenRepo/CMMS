using cmms_api.Data;
using cmms_api.Models;
using Microsoft.EntityFrameworkCore;

namespace cmms_api.Services;

public record CreateWorkOrderRequest(
    int AssetId,
    string Title,
    string Description,
    WorkOrderPriority Priority,
    string RequesterName,
    string? BeforePhotoUrl = null
);

public record AssignTechnicianRequest(
    int TechnicianId
);

public record UsedPartDto(
    int SparePartId,
    int Quantity
);

public record CompleteWorkOrderRequest(
    string? AfterPhotoUrl,
    string? TechnicianNotes,
    decimal LaborHours,
    List<UsedPartDto>? UsedParts = null
);

public interface IWorkOrderService
{
    Task<List<WorkOrder>> GetAllWorkOrdersAsync();
    Task<WorkOrder?> GetWorkOrderByIdAsync(int id);
    Task<WorkOrder> CreateWorkOrderAsync(CreateWorkOrderRequest request);
    Task<WorkOrder> AssignTechnicianAsync(int workOrderId, int technicianId);
    Task<WorkOrder> StartRepairAsync(int workOrderId);
    Task<WorkOrder> CompleteRepairAsync(int workOrderId, CompleteWorkOrderRequest request);
}

public class WorkOrderService : IWorkOrderService
{
    private readonly CmmsDbContext _db;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<WorkOrderService> _logger;

    public WorkOrderService(
        CmmsDbContext db,
        TimeProvider timeProvider,
        ILogger<WorkOrderService> logger)
    {
        _db = db;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<List<WorkOrder>> GetAllWorkOrdersAsync()
    {
        return await _db.WorkOrders
            .Include(w => w.Parts)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<WorkOrder?> GetWorkOrderByIdAsync(int id)
    {
        return await _db.WorkOrders
            .Include(w => w.Parts)
            .FirstOrDefaultAsync(w => w.Id == id);
    }

    /// <summary>
    /// Creation: DRAFT/NEW -> OPEN
    /// Invariant: WorkOrderMustLinkToValidAsset
    /// </summary>
    public async Task<WorkOrder> CreateWorkOrderAsync(CreateWorkOrderRequest request)
    {
        var asset = await _db.Assets.FindAsync(request.AssetId)
            ?? throw new ArgumentException($"Invariant violation [WorkOrderMustLinkToValidAsset]: Asset ID {request.AssetId} does not exist in plant registry.");

        var count = await _db.WorkOrders.CountAsync();
        var woNumber = $"WO-{_timeProvider.GetUtcNow().Year}-{(count + 1):D4}";

        var workOrder = new WorkOrder
        {
            WorkOrderNumber = woNumber,
            AssetId = asset.Id,
            AssetTag = asset.AssetTag,
            AssetName = asset.Name,
            AssetLocation = asset.Location,
            Title = request.Title,
            Description = request.Description,
            Priority = request.Priority,
            Status = WorkOrderStatus.OPEN,
            RequesterName = request.RequesterName,
            CreatedAt = _timeProvider.GetUtcNow().UtcDateTime,
            BeforePhotoUrl = request.BeforePhotoUrl
        };

        if (request.Priority == WorkOrderPriority.Critical)
        {
            asset.Status = AssetStatus.Down;
        }
        else
        {
            asset.Status = AssetStatus.Degraded;
        }

        _db.WorkOrders.Add(workOrder);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Work Order {WONo} created for Asset {AssetTag} ({AssetName})",
            workOrder.WorkOrderNumber, asset.AssetTag, asset.Name);

        return workOrder;
    }

    /// <summary>
    /// Transition 1: OPEN -> ASSIGNED
    /// Trigger: ASSIGN_TECH
    /// Handler: WorkOrders.Assign
    /// Side-effects: SlaWatchdog.Start(4h)
    /// </summary>
    public async Task<WorkOrder> AssignTechnicianAsync(int workOrderId, int technicianId)
    {
        var workOrder = await _db.WorkOrders
            .Include(w => w.Parts)
            .FirstOrDefaultAsync(w => w.Id == workOrderId)
            ?? throw new KeyNotFoundException($"Work Order ID {workOrderId} not found.");

        var tech = await _db.Technicians.FindAsync(technicianId)
            ?? throw new ArgumentException($"Technician ID {technicianId} not found.");

        workOrder.AssignedTechnicianId = tech.Id;
        workOrder.AssignedTechnicianName = tech.Name;
        workOrder.Status = WorkOrderStatus.ASSIGNED;
        workOrder.AssignedAt = _timeProvider.GetUtcNow().UtcDateTime;

        // Side-Effect: SlaWatchdog.Start(4h)
        workOrder.SlaDueAt = _timeProvider.GetUtcNow().UtcDateTime.AddHours(4);
        workOrder.SlaBreached = false;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Work Order {WONo} ASSIGNED to {Tech}. SLA 4H Watchdog set for {Due:HH:mm:ss}",
            workOrder.WorkOrderNumber, tech.Name, workOrder.SlaDueAt);

        return workOrder;
    }

    /// <summary>
    /// Transition 2: ASSIGNED -> IN_PROGRESS
    /// Trigger: TECH_START
    /// Handler: WorkOrders.Start
    /// </summary>
    public async Task<WorkOrder> StartRepairAsync(int workOrderId)
    {
        var workOrder = await _db.WorkOrders
            .Include(w => w.Parts)
            .FirstOrDefaultAsync(w => w.Id == workOrderId)
            ?? throw new KeyNotFoundException($"Work Order ID {workOrderId} not found.");

        if (workOrder.Status != WorkOrderStatus.ASSIGNED && workOrder.Status != WorkOrderStatus.OPEN)
        {
            throw new InvalidOperationException($"Cannot start work order with status '{workOrder.Status}'.");
        }

        workOrder.Status = WorkOrderStatus.IN_PROGRESS;
        workOrder.StartedAt = _timeProvider.GetUtcNow().UtcDateTime;

        var asset = await _db.Assets.FindAsync(workOrder.AssetId);
        if (asset != null)
        {
            asset.Status = AssetStatus.UnderMaintenance;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Work Order {WONo} TECH_START -> IN_PROGRESS by {Tech}",
            workOrder.WorkOrderNumber, workOrder.AssignedTechnicianName);

        return workOrder;
    }

    /// <summary>
    /// Transition 3: IN_PROGRESS -> RESOLVED
    /// Trigger: COMPLETE_REPAIR
    /// Handler: WorkOrders.Complete
    /// Validation: AfterPhotoUrl != null (Invariant: AfterPhotoMandatoryForResolution)
    /// Side-effects: Stock.DeductParts, Cost.CalculateTotal
    /// </summary>
    public async Task<WorkOrder> CompleteRepairAsync(int workOrderId, CompleteWorkOrderRequest request)
    {
        var workOrder = await _db.WorkOrders
            .Include(w => w.Parts)
            .FirstOrDefaultAsync(w => w.Id == workOrderId)
            ?? throw new KeyNotFoundException($"Work Order ID {workOrderId} not found.");

        // Invariant Validation: AfterPhotoMandatoryForResolution
        if (string.IsNullOrWhiteSpace(request.AfterPhotoUrl))
        {
            throw new InvalidOperationException(
                "Invariant violation [AfterPhotoMandatoryForResolution]: Completion requires after-repair photo proof (AfterPhotoUrl cannot be null or empty)."
            );
        }

        workOrder.AfterPhotoUrl = request.AfterPhotoUrl;
        workOrder.TechnicianNotes = request.TechnicianNotes;
        workOrder.LaborHours = request.LaborHours;

        // Fetch technician hourly rate for labor cost calculation
        decimal techRate = 450.0m;
        if (workOrder.AssignedTechnicianId.HasValue)
        {
            var tech = await _db.Technicians.FindAsync(workOrder.AssignedTechnicianId.Value);
            if (tech != null) techRate = tech.HourlyRate;
        }

        // Side-Effect: Cost.CalculateTotal (Labor Cost)
        workOrder.LaborCost = Math.Round(request.LaborHours * techRate, 2);

        // Side-Effect: Stock.DeductParts
        if (request.UsedParts != null && request.UsedParts.Count > 0)
        {
            foreach (var usedPart in request.UsedParts)
            {
                var sparePart = await _db.SpareParts.FindAsync(usedPart.SparePartId)
                    ?? throw new ArgumentException($"Spare Part ID {usedPart.SparePartId} not found.");

                if (sparePart.CurrentStock < usedPart.Quantity)
                {
                    _logger.LogWarning("Spare part '{Part}' low stock! Available: {Avail}, Required: {Req}",
                        sparePart.Name, sparePart.CurrentStock, usedPart.Quantity);
                }

                // Atomically deduct inventory stock
                sparePart.CurrentStock = Math.Max(0, sparePart.CurrentStock - usedPart.Quantity);

                workOrder.Parts.Add(new WorkOrderPart
                {
                    SparePartId = sparePart.Id,
                    PartNumber = sparePart.PartNumber,
                    PartName = sparePart.Name,
                    QuantityUsed = usedPart.Quantity,
                    UnitCost = sparePart.UnitCost
                });

                _logger.LogInformation("Stock.DeductParts: {Qty}x {Part} deducted from inventory. Remaining: {Rem}",
                    usedPart.Quantity, sparePart.Name, sparePart.CurrentStock);
            }
        }

        workOrder.Status = WorkOrderStatus.RESOLVED;
        workOrder.ResolvedAt = _timeProvider.GetUtcNow().UtcDateTime;

        // Restore Asset to Operational status
        var asset = await _db.Assets.FindAsync(workOrder.AssetId);
        if (asset != null)
        {
            asset.Status = AssetStatus.Operational;
            asset.LastMaintainedAt = _timeProvider.GetUtcNow().UtcDateTime;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Work Order {WONo} RESOLVED. Total Cost: {Cost:N2} THB (Labor: {Labor:N2}, Parts: {Parts:N2})",
            workOrder.WorkOrderNumber, workOrder.TotalCost, workOrder.LaborCost, workOrder.PartsCost);

        return workOrder;
    }
}
