using Microsoft.EntityFrameworkCore;
using cmms_api.Models;

namespace cmms_api.Data;

public class CmmsDbContext : DbContext
{
    public CmmsDbContext(DbContextOptions<CmmsDbContext> options) : base(options)
    {
    }

    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Technician> Technicians => Set<Technician>();
    public DbSet<SparePart> SpareParts => Set<SparePart>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderPart> WorkOrderParts => Set<WorkOrderPart>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed Assets
        modelBuilder.Entity<Asset>().HasData(
            new Asset
            {
                Id = 1,
                AssetTag = "AST-PUMP-01",
                Name = "High-Pressure Hydraulic Power Unit (HPU)",
                Category = "Hydraulics",
                Location = "Factory Floor Line 1 - Press Stamping",
                Status = AssetStatus.Operational,
                Manufacturer = "Bosch Rexroth",
                ModelNumber = "A10VSO-71",
                SerialNumber = "BR-2024-9981"
            },
            new Asset
            {
                Id = 2,
                AssetTag = "AST-CHILLER-02",
                Name = "Central Water-Cooled Chiller System (300 TR)",
                Category = "HVAC & Cooling",
                Location = "Utility Building - Rooftop Plant",
                Status = AssetStatus.Operational,
                Manufacturer = "Daikin Applied",
                ModelNumber = "EWWD-VZ-300",
                SerialNumber = "DK-2023-1102"
            },
            new Asset
            {
                Id = 3,
                AssetTag = "AST-CNC-03",
                Name = "5-Axis High-Precision CNC Machining Center",
                Category = "Machining",
                Location = "Clean Machine Shop B",
                Status = AssetStatus.Operational,
                Manufacturer = "DMG MORI",
                ModelNumber = "DMU 50 3rd Gen",
                SerialNumber = "DM-2024-5541"
            },
            new Asset
            {
                Id = 4,
                AssetTag = "AST-COMP-04",
                Name = "Rotary Screw Industrial Air Compressor (75 kW)",
                Category = "Pneumatics",
                Location = "Utility Room 102",
                Status = AssetStatus.Operational,
                Manufacturer = "Atlas Copco",
                ModelNumber = "GA 75 VSD+",
                SerialNumber = "AC-2023-7721"
            },
            new Asset
            {
                Id = 5,
                AssetTag = "AST-CONV-05",
                Name = "Main Assembly Bottling Conveyor Line 2",
                Category = "Material Handling",
                Location = "Packaging Hall A",
                Status = AssetStatus.Operational,
                Manufacturer = "Siemens Drives",
                ModelNumber = "SIMOGEAR-K",
                SerialNumber = "SM-2024-3389"
            }
        );

        // Seed Technicians
        modelBuilder.Entity<Technician>().HasData(
            new Technician { Id = 1, Name = "Somchai Prasert (Lead Mech)", Specialty = "Mechanical & Hydraulics", Phone = "+66 81 234 5678", HourlyRate = 500.0m, IsAvailable = true },
            new Technician { Id = 2, Name = "Anan Srisuk (Electrical/PLC)", Specialty = "Electrical & Automation", Phone = "+66 89 876 5432", HourlyRate = 550.0m, IsAvailable = true },
            new Technician { Id = 3, Name = "Kittisak Wong (HVAC Specialist)", Specialty = "HVAC & Thermal Systems", Phone = "+66 86 333 4455", HourlyRate = 480.0m, IsAvailable = true }
        );

        // Seed Spare Parts Inventory
        modelBuilder.Entity<SparePart>().HasData(
            new SparePart { Id = 1, PartNumber = "SKF-6205-2RS", Name = "Deep Groove Ball Bearing 25x52x15mm", Category = "Bearings", CurrentStock = 45, MinimumThreshold = 10, UnitCost = 350.0m, Unit = "pcs" },
            new SparePart { Id = 2, PartNumber = "VIT-ORING-75", Name = "High-Temp Viton Hydraulic O-Ring Seal Kit", Category = "Seals", CurrentStock = 80, MinimumThreshold = 15, UnitCost = 180.0m, Unit = "set" },
            new SparePart { Id = 3, PartNumber = "FIL-HYD-10U", Name = "Hydraulic Return Line Filter Element 10 Micron", Category = "Filtration", CurrentStock = 25, MinimumThreshold = 5, UnitCost = 1250.0m, Unit = "pcs" },
            new SparePart { Id = 4, PartNumber = "OIL-ISO-VG46", Name = "Synthetic Anti-Wear Hydraulic Fluid (20L Pail)", Category = "Lubricants", CurrentStock = 30, MinimumThreshold = 8, UnitCost = 2800.0m, Unit = "pail" },
            new SparePart { Id = 5, PartNumber = "IND-PRX-M12", Name = "Inductive Proximity Sensor M12 PNP NO", Category = "Sensors", CurrentStock = 20, MinimumThreshold = 4, UnitCost = 890.0m, Unit = "pcs" }
        );

        // Seed Initial Work Order
        modelBuilder.Entity<WorkOrder>().HasData(
            new WorkOrder
            {
                Id = 1,
                WorkOrderNumber = "WO-2026-0001",
                AssetId = 1,
                AssetTag = "AST-PUMP-01",
                AssetName = "High-Pressure Hydraulic Power Unit (HPU)",
                AssetLocation = "Factory Floor Line 1 - Press Stamping",
                Title = "Hydraulic Pressure Fluctuation & Minor Flange Leak",
                Description = "Line operator reported pressure dropping from 210 bar to 160 bar during cycle clamp. Oil seepage around port B flange.",
                Priority = WorkOrderPriority.High,
                Status = WorkOrderStatus.OPEN,
                RequesterName = "Nattawut (Line 1 Leader)",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                BeforePhotoUrl = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
            }
        );
    }
}
