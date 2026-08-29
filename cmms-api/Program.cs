using cmms_api.Data;
using cmms_api.Jobs;
using cmms_api.Models;
using cmms_api.Services;
using Coravel;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IAssetQrService, AssetQrService>();
builder.Services.AddScoped<IWorkOrderService, WorkOrderService>();

// Coravel Scheduler & Invocables
builder.Services.AddScheduler();
builder.Services.AddTransient<SlaWatchdogJob>();

// CORS for Next.js frontend (cmms-web)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure Database: PostgreSQL if connection string is set, else InMemory
var postgresConn = builder.Configuration.GetConnectionString("PostgresConnection");
if (!string.IsNullOrEmpty(postgresConn))
{
    builder.Services.AddDbContext<CmmsDbContext>(opt =>
        opt.UseNpgsql(postgresConn));
}
else
{
    builder.Services.AddDbContext<CmmsDbContext>(opt =>
        opt.UseInMemoryDatabase("CmmsInMemoryDb"));
}

var app = builder.Build();

// Ensure Database is Created & Generate Asset QR Codes
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CmmsDbContext>();
    var qrService = scope.ServiceProvider.GetRequiredService<IAssetQrService>();
    db.Database.EnsureCreated();

    // Populate QR codes for seeded assets
    var assets = db.Assets.ToList();
    foreach (var asset in assets)
    {
        if (string.IsNullOrEmpty(asset.QrCodeBase64))
        {
            asset.QrCodeBase64 = qrService.GenerateAssetQrCodeBase64(asset.Id, asset.AssetTag, asset.Name);
        }
    }
    db.SaveChanges();
}

app.UseCors();

// Schedule Coravel SLA Watchdog Job every 30 seconds
app.Services.UseScheduler(scheduler =>
{
    scheduler.Schedule<SlaWatchdogJob>().EverySeconds(30);
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Health Check
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    system = "07_CMMS_ENGINE",
    timestamp = DateTime.UtcNow,
    engine = ".NET 10 + Coravel + QRCoder + EF Core 10"
}));

// Assets Catalog & QR Code
app.MapGet("/api/assets", async (CmmsDbContext db, IAssetQrService qrService) =>
{
    var assets = await db.Assets.OrderBy(a => a.Id).ToListAsync();
    foreach (var a in assets)
    {
        if (string.IsNullOrEmpty(a.QrCodeBase64))
        {
            a.QrCodeBase64 = qrService.GenerateAssetQrCodeBase64(a.Id, a.AssetTag, a.Name);
        }
    }
    return Results.Ok(assets);
});

app.MapGet("/api/assets/{id}", async (int id, CmmsDbContext db, IAssetQrService qrService) =>
{
    var asset = await db.Assets.FindAsync(id);
    if (asset == null) return Results.NotFound();
    if (string.IsNullOrEmpty(asset.QrCodeBase64))
    {
        asset.QrCodeBase64 = qrService.GenerateAssetQrCodeBase64(asset.Id, asset.AssetTag, asset.Name);
    }
    return Results.Ok(asset);
});

// Work Orders Endpoint (State Transitions & Invariants)
app.MapGet("/api/workorders", async (IWorkOrderService woService) =>
{
    var orders = await woService.GetAllWorkOrdersAsync();
    return Results.Ok(orders);
});

app.MapGet("/api/workorders/{id}", async (int id, IWorkOrderService woService) =>
{
    var order = await woService.GetWorkOrderByIdAsync(id);
    return order != null ? Results.Ok(order) : Results.NotFound();
});

// Create Work Order (Invariant: WorkOrderMustLinkToValidAsset)
app.MapPost("/api/workorders", async (CreateWorkOrderRequest request, IWorkOrderService woService) =>
{
    try
    {
        var wo = await woService.CreateWorkOrderAsync(request);
        return Results.Created($"/api/workorders/{wo.Id}", wo);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// Transition 1: OPEN -> ASSIGNED (Trigger: ASSIGN_TECH, Side-effects: SlaWatchdog.Start(4h))
app.MapPost("/api/workorders/{id}/assign", async (int id, AssignDto dto, IWorkOrderService woService) =>
{
    try
    {
        var wo = await woService.AssignTechnicianAsync(id, dto.TechnicianId);
        return Results.Ok(wo);
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Transition 2: ASSIGNED -> IN_PROGRESS (Trigger: TECH_START)
app.MapPost("/api/workorders/{id}/start", async (int id, IWorkOrderService woService) =>
{
    try
    {
        var wo = await woService.StartRepairAsync(id);
        return Results.Ok(wo);
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Transition 3: IN_PROGRESS -> RESOLVED (Trigger: COMPLETE_REPAIR)
// Validation: AfterPhotoUrl != null (Invariant: AfterPhotoMandatoryForResolution)
// Side-effects: Stock.DeductParts, Cost.CalculateTotal
app.MapPost("/api/workorders/{id}/complete", async (int id, CompleteWorkOrderRequest request, IWorkOrderService woService) =>
{
    try
    {
        var wo = await woService.CompleteRepairAsync(id, request);
        return Results.Ok(wo);
    }
    catch (KeyNotFoundException)
    {
        return Results.NotFound();
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

// Technicians & Spare Parts
app.MapGet("/api/technicians", async (CmmsDbContext db) =>
{
    var techs = await db.Technicians.ToListAsync();
    return Results.Ok(techs);
});

app.MapGet("/api/spare-parts", async (CmmsDbContext db) =>
{
    var parts = await db.SpareParts.ToListAsync();
    return Results.Ok(parts);
});

app.MapPost("/api/spare-parts/{id}/restock", async (int id, RestockDto dto, CmmsDbContext db) =>
{
    var part = await db.SpareParts.FindAsync(id);
    if (part == null) return Results.NotFound();
    part.CurrentStock += dto.Quantity;
    await db.SaveChangesAsync();
    return Results.Ok(part);
});

// Plant Maintenance KPIs
app.MapGet("/api/dashboard/stats", async (CmmsDbContext db) =>
{
    var totalAssets = await db.Assets.CountAsync();
    var operationalAssets = await db.Assets.CountAsync(a => a.Status == AssetStatus.Operational);
    var uptimePercentage = totalAssets > 0 ? Math.Round((decimal)operationalAssets / totalAssets * 100, 1) : 100m;

    var totalWos = await db.WorkOrders.CountAsync();
    var activeWos = await db.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.OPEN || w.Status == WorkOrderStatus.ASSIGNED || w.Status == WorkOrderStatus.IN_PROGRESS);
    var resolvedWos = await db.WorkOrders.CountAsync(w => w.Status == WorkOrderStatus.RESOLVED || w.Status == WorkOrderStatus.CLOSED);
    var breachedSlas = await db.WorkOrders.CountAsync(w => w.SlaBreached);
    var totalMaintenanceCost = await db.WorkOrders.Where(w => w.Status == WorkOrderStatus.RESOLVED).SumAsync(w => w.LaborCost + w.Parts.Sum(p => p.TotalCost));

    return Results.Ok(new
    {
        totalAssets,
        operationalAssets,
        uptimePercentage,
        activeWos,
        resolvedWos,
        breachedSlas,
        totalMaintenanceCost
    });
});

app.Run();

public record AssignDto(int TechnicianId);
public record RestockDto(int Quantity);
