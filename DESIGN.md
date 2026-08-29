system: 07_CMMS_ENGINE
tech_stack:
  frontend: "Next.js 16 (PWA) + html5-qrcode + browser-image-compression"
  backend: ".NET 10 + Coravel + QRCoder + TimeProvider"
  orm: "EF Core 10 (Npgsql.EntityFrameworkCore.PostgreSQL)"
  storage: "PostgreSQL 18 + S3/MinIO"
  protocols: "HTTPS, S3 Presigned Uploads"
spec:
  actors: [Requester, MaintenanceLead, Technician, CoravelScheduler]
  invariants: [WorkOrderMustLinkToValidAsset, AfterPhotoMandatoryForResolution]
  state_transitions:
    - { from: OPEN, to: ASSIGNED, trigger: ASSIGN_TECH, handler: "WorkOrders.Assign", side_effects: ["SlaWatchdog.Start(4h)"] }
    - { from: ASSIGNED, to: IN_PROGRESS, trigger: TECH_START, handler: "WorkOrders.Start" }
    - { from: IN_PROGRESS, to: RESOLVED, trigger: COMPLETE_REPAIR, handler: "WorkOrders.Complete", validation: "AfterPhotoUrl != null", side_effects: ["Stock.DeductParts", "Cost.CalculateTotal"] }