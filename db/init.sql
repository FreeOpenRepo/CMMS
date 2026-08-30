-- =============================================================================
-- CMMS Maintenance Engine Initial Database Schema & Seed Data (cmms_db)
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS "MaintenanceLogs" CASCADE;
DROP TABLE IF EXISTS "MaintenancePlans" CASCADE;
DROP TABLE IF EXISTS "WorkOrders" CASCADE;
DROP TABLE IF EXISTS "Assets" CASCADE;

-- 1. Machines / Equipment Assets
CREATE TABLE "Assets" (
    "Id" SERIAL PRIMARY KEY,
    "AssetCode" VARCHAR(50) NOT NULL UNIQUE,
    "Name" VARCHAR(200) NOT NULL,
    "Category" VARCHAR(100) NOT NULL,
    "Location" VARCHAR(100) NOT NULL,
    "QrCodeBase64" TEXT,
    "Status" VARCHAR(50) DEFAULT 'OPERATIONAL', -- OPERATIONAL, UNDER_MAINTENANCE, DECOMMISSIONED
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Work Orders
CREATE TABLE "WorkOrders" (
    "Id" SERIAL PRIMARY KEY,
    "WorkOrderCode" VARCHAR(50) NOT NULL UNIQUE,
    "AssetId" INT NOT NULL REFERENCES "Assets"("Id") ON DELETE CASCADE,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Priority" VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    "Status" VARCHAR(50) DEFAULT 'OPEN',     -- OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    "AssignedTechnician" VARCHAR(100),
    "ScheduledDate" TIMESTAMP WITH TIME ZONE,
    "CompletedAt" TIMESTAMP WITH TIME ZONE,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Preventative Maintenance Plans (Coravel Scheduler triggers)
CREATE TABLE "MaintenancePlans" (
    "Id" SERIAL PRIMARY KEY,
    "PlanCode" VARCHAR(50) NOT NULL UNIQUE,
    "AssetId" INT NOT NULL REFERENCES "Assets"("Id") ON DELETE CASCADE,
    "CronExpression" VARCHAR(100) NOT NULL, -- e.g. "0 0 * * 1" (Weekly)
    "IntervalDays" INT DEFAULT 30,
    "Title" VARCHAR(255) NOT NULL,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "LastTriggeredAt" TIMESTAMP WITH TIME ZONE
);

-- Seed Initial Assets
INSERT INTO "Assets" ("Id", "AssetCode", "Name", "Category", "Location", "Status") VALUES
(1, 'AST-CNC-001', '5-Axis CNC Milling Center', 'Heavy Machinery', 'Factory Floor Zone A', 'OPERATIONAL'),
(2, 'AST-HYD-002', 'High-Pressure Hydraulic Press 200T', 'Hydraulics', 'Plant B Bay 3', 'OPERATIONAL'),
(3, 'AST-AIR-003', 'Industrial Rotary Screw Compressor 75kW', 'Pneumatics', 'Utility Room East', 'UNDER_MAINTENANCE')
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "WorkOrders" ("Id", "WorkOrderCode", "AssetId", "Title", "Priority", "Status", "AssignedTechnician", "ScheduledDate") VALUES
(1, 'WO-2026-0101', 1, 'Spindle Bearing Lubrication & Calibration', 'MEDIUM', 'OPEN', 'Somchai Mechanic', CURRENT_TIMESTAMP + INTERVAL '2 days'),
(2, 'WO-2026-0102', 3, 'Air Filter & Oil Separator Element Replacement', 'HIGH', 'IN_PROGRESS', 'Wichai Tech', CURRENT_TIMESTAMP)
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "MaintenancePlans" ("Id", "PlanCode", "AssetId", "CronExpression", "IntervalDays", "Title", "IsActive") VALUES
(1, 'PM-CNC-MONTHLY', 1, '0 0 1 * *', 30, 'Monthly CNC Precision Laser Alignment', TRUE),
(2, 'PM-HYD-QUARTER', 2, '0 0 1 */3 *', 90, 'Quarterly Hydraulic Fluid Analysis & Seal Inspection', TRUE)
ON CONFLICT ("Id") DO NOTHING;

SELECT setval(pg_get_serial_sequence('"Assets"', 'Id'), COALESCE(max("Id"), 1)) FROM "Assets";
SELECT setval(pg_get_serial_sequence('"WorkOrders"', 'Id'), COALESCE(max("Id"), 1)) FROM "WorkOrders";
SELECT setval(pg_get_serial_sequence('"MaintenancePlans"', 'Id'), COALESCE(max("Id"), 1)) FROM "MaintenancePlans";
