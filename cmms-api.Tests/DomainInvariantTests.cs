using cmms_api.Data;
using cmms_api.Models;
using cmms_api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace cmms_api.Tests;

public class DomainInvariantTests
{
    private CmmsDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<CmmsDbContext>()
            .UseInMemoryDatabase(databaseName: $"CmmsTestDb_{Guid.NewGuid()}")
            .Options;

        var db = new CmmsDbContext(options);
        db.Database.EnsureCreated();
        return db;
    }

    [Fact]
    public async Task Invariant_WorkOrderMustLinkToValidAsset_RejectsInvalidAssetId()
    {
        using var db = CreateInMemoryDbContext();
        var woService = new WorkOrderService(db, TimeProvider.System, NullLogger<WorkOrderService>.Instance);

        // Attempting to create work order for non-existent Asset ID 99999
        var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
            woService.CreateWorkOrderAsync(new CreateWorkOrderRequest(
                AssetId: 99999,
                Title: "Broken Motor",
                Description: "Motor overheating",
                Priority: WorkOrderPriority.High,
                RequesterName: "John"
            ))
        );

        Assert.Contains("WorkOrderMustLinkToValidAsset", ex.Message);
    }

    [Fact]
    public async Task Invariant_AfterPhotoMandatoryForResolution_RejectsWithoutAfterPhoto()
    {
        using var db = CreateInMemoryDbContext();
        var woService = new WorkOrderService(db, TimeProvider.System, NullLogger<WorkOrderService>.Instance);

        // Create, Assign, and Start work order on Asset 1 (seeded)
        var wo = await woService.CreateWorkOrderAsync(new CreateWorkOrderRequest(
            AssetId: 1,
            Title: "Replace Hydraulic Seals",
            Description: "Leaking oil from valve B",
            Priority: WorkOrderPriority.Medium,
            RequesterName: "Somchai"
        ));

        await woService.AssignTechnicianAsync(wo.Id, 1);
        await woService.StartRepairAsync(wo.Id);

        // Attempt to complete WITHOUT after-repair photo proof (AfterPhotoUrl is null)
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            woService.CompleteRepairAsync(wo.Id, new CompleteWorkOrderRequest(
                AfterPhotoUrl: null, // Missing!
                TechnicianNotes: "Seals replaced and tested at 200 bar",
                LaborHours: 2.5m
            ))
        );

        Assert.Contains("AfterPhotoMandatoryForResolution", ex.Message);
    }

    [Fact]
    public async Task StateTransitions_CompleteFlow_DeductsSparePartsAndCalculatesCost()
    {
        using var db = CreateInMemoryDbContext();
        var woService = new WorkOrderService(db, TimeProvider.System, NullLogger<WorkOrderService>.Instance);

        // Spare Part 1 (SKF Ball Bearing) stock is 45 pcs, cost is 350 THB
        var part = await db.SpareParts.FindAsync(1);
        Assert.NotNull(part);
        var initialStock = part.CurrentStock;

        // 1. Create Work Order (OPEN)
        var wo = await woService.CreateWorkOrderAsync(new CreateWorkOrderRequest(
            AssetId: 1,
            Title: "Bearing Replacement",
            Description: "Loud noise from pump shaft",
            Priority: WorkOrderPriority.High,
            RequesterName: "Technician Lead"
        ));
        Assert.Equal(WorkOrderStatus.OPEN, wo.Status);

        // 2. Assign Technician (ASSIGNED, SlaDueAt = +4h)
        var assignedWo = await woService.AssignTechnicianAsync(wo.Id, 1);
        Assert.Equal(WorkOrderStatus.ASSIGNED, assignedWo.Status);
        Assert.NotNull(assignedWo.SlaDueAt);
        Assert.True(assignedWo.SlaDueAt > DateTime.UtcNow.AddHours(3.5));

        // 3. Start Repair (IN_PROGRESS)
        var inProgWo = await woService.StartRepairAsync(wo.Id);
        Assert.Equal(WorkOrderStatus.IN_PROGRESS, inProgWo.Status);

        // 4. Complete Repair (RESOLVED) with After-Photo and 2x Bearings
        var resolvedWo = await woService.CompleteRepairAsync(wo.Id, new CompleteWorkOrderRequest(
            AfterPhotoUrl: "https://images.unsplash.com/photo-after-repair.jpg",
            TechnicianNotes: "Replaced 2x SKF Bearings, shaft aligned with dial indicator",
            LaborHours: 3.0m, // 3h * 500 THB = 1,500 THB Labor Cost
            UsedParts: new List<UsedPartDto>
            {
                new(SparePartId: 1, Quantity: 2) // 2 * 350 = 700 THB Parts Cost
            }
        ));

        Assert.Equal(WorkOrderStatus.RESOLVED, resolvedWo.Status);
        Assert.Equal(1500.0m, resolvedWo.LaborCost);
        Assert.Equal(700.0m, resolvedWo.PartsCost);
        Assert.Equal(2200.0m, resolvedWo.TotalCost);

        // Invariant Side-effect: Stock.DeductParts
        var updatedPart = await db.SpareParts.FindAsync(1);
        Assert.NotNull(updatedPart);
        Assert.Equal(initialStock - 2, updatedPart.CurrentStock);
    }
}
