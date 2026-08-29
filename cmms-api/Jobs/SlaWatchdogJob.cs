using Coravel.Invocable;
using cmms_api.Data;
using cmms_api.Models;
using Microsoft.EntityFrameworkCore;

namespace cmms_api.Jobs;

public class SlaWatchdogJob : IInvocable
{
    private readonly CmmsDbContext _db;
    private readonly ILogger<SlaWatchdogJob> _logger;

    public SlaWatchdogJob(CmmsDbContext db, ILogger<SlaWatchdogJob> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task Invoke()
    {
        var now = DateTime.UtcNow;
        var activeWorkOrders = await _db.WorkOrders
            .Where(w => (w.Status == WorkOrderStatus.ASSIGNED || w.Status == WorkOrderStatus.IN_PROGRESS)
                     && w.SlaDueAt != null
                     && !w.SlaBreached)
            .ToListAsync();

        foreach (var wo in activeWorkOrders)
        {
            if (wo.SlaDueAt < now)
            {
                wo.SlaBreached = true;
                _logger.LogWarning("🚨 SLA 4H BREACH DETECTED: Work Order {WONo} ({Title}) assigned to {Tech} is overdue!",
                    wo.WorkOrderNumber, wo.Title, wo.AssignedTechnicianName);
            }
        }

        await _db.SaveChangesAsync();
    }
}
