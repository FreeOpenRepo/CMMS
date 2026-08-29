# 07_CMMS_ENGINE: Computerized Maintenance Management System

ระบบบริหารจัดการงานซ่อมบำรุงโรงงานและเครื่องจักรอุตสาหกรรม (CMMS) แบบครบวงจร พร้อมระบบสแกน QR Code หน้าเครื่องจักร, ระบบบีบอัดรูปภาพก่อนส่ง, ระบบนับถอยหลัง 4-Hour SLA Watchdog อัตโนมัติด้วย Coravel, และการตัดสต็อกอะไหล่ซ่อมบำรุง

---

## 🔄 ภาพรวม Workflow การทำงาน (Business & Technical Workflow)

```mermaid
flowchart TD
    Req["Requester (ผู้แจ้งซ่อม)<br/>สแกน QR Tag แจ้งเครื่องจักรเสีย"] -->|"1. Create Work Order (Status: OPEN)"| API[".NET 10 CMMS API"]
    API --> Lead["Maintenance Lead (หัวหน้าช่าง)<br/>เห็นงานในบอร์ดจ่ายงาน"]
    Lead -->|"2. Assign Tech (OPEN to ASSIGNED)"| CoravelWatchdog["Coravel SLA Watchdog<br/>เริ่มนับถอยหลัง SLA 4 ชั่วโมง"]
    Lead --> Tech["Technician (ช่างซ่อม)<br/>รับงานผ่าน Mobile PWA"]
    Tech -->|"3. Tech Start (ASSIGNED to IN_PROGRESS)"| Repairing["เข้าทำการซ่อมบำรุงหน้างาน<br/>เครื่องจักรเป็น UnderMaintenance"]
    Repairing --> CompleteStep["ถ่ายรูปหลังซ่อม (After Photo)<br/>และระบุอะไหล่ที่ใช้"]
    CompleteStep -->|"4. Complete Repair (IN_PROGRESS to RESOLVED)"| Validation{"Validation Invariant<br/>AfterPhotoMandatoryForResolution"}
    Validation -->|"มีรูปถ่าย After Photo"| Success["ปิดงานสำเร็จ<br/>1. ตัดสต็อกอะไหล่ Stock.DeductParts<br/>2. คำนวณค่าแรงและค่าอะไหล่ Cost.CalculateTotal<br/>3. คืนสถานะเครื่องจักรเป็น Operational"]
    Validation -->|"ไม่มีรูปถ่าย"| Reject["Reject (ไม่อนุญาตให้ปิดงาน)"]
```

### รายละเอียดขั้นตอนการเปลี่ยนสถานะ (State Transitions):
1. **`NEW ➔ OPEN` (Trigger: `CREATE_WO`)**: ผู้แจ้งซ่อมสแกน QR Code บนเครื่องจักร กรอกอาการเสีย และแนบรูปภาพก่อนซ่อม
2. **`OPEN ➔ ASSIGNED` (Trigger: `ASSIGN_TECH`)**: หัวหน้าช่างมอบหมายงานให้ช่างซ่อมที่มีความเชี่ยวชาญตรงสาย ระบบเริ่มนับถอยหลัง SLA 4 ชม. อัตโนมัติ
3. **`ASSIGNED ➔ IN_PROGRESS` (Trigger: `TECH_START`)**: ช่างซ่อมกดรับงานเมื่อเดินทางถึงหน้างาน เครื่องจักรจะเปลี่ยนสถานะเป็น "UnderMaintenance"
4. **`IN_PROGRESS ➔ RESOLVED` (Trigger: `COMPLETE_REPAIR`)**:
   - ช่างซ่อมต้องอัปโหลดรูปถ่ายหลังซ่อมเสร็จ (**บังคับตาม Invariant**)
   - บันทึกชั่วโมงแรงงานและรายการอะไหล่ที่ใช้
   - ระบบทำการตัดสต็อกอะไหล่จริงในคลัง และคำนวณต้นทุนรวมการซ่อมบำรุง

---

## 🛡️ กฎเหล็กของระบบ (Domain Invariants)

1. **`WorkOrderMustLinkToValidAsset` (ใบแจ้งซ่อมต้องผูกกับเครื่องจักรที่มีอยู่จริง)**:
   - ป้องกันการสร้างใบแจ้งซ่อมลอยๆ ทุก Work Order ต้องผูกกับ Asset ID ที่ลงทะเบียนไว้ในระบบ เพื่อเก็บประวัติการซ่อมบำรุง (Maintenance History) และคำนวณค่า MTBF/MTTR ได้ถูกต้อง
2. **`AfterPhotoMandatoryForResolution` (ต้องมีรูปถ่ายหลังซ่อมจึงจะปิดงานได้)**:
   - ป้องกันการปิดงานซ่อมทิพย์ ช่างซ่อมทุกคนต้องถ่ายรูปชิ้นงานหรือเครื่องจักรหลังการซ่อมเสร็จเพื่อใช้เป็นหลักฐานยืนยันความปลอดภัยก่อนคืนเครื่องจักรเข้าสู่สายการผลิต

---

## 💻 Tech Stack & เหตุผลในการเลือกใช้

| ส่วนประกอบ | เทคโนโลยีที่เลือก | เหตุผลที่เลือก | ข้อดีหลัก (Advantages) |
|---|---|---|---|
| **Frontend UI (PWA)**| **Next.js 16 + React 19** | ออกแบบเป็น Progressive Web App (PWA) ใช้งานได้ทั้งบนมือถือและแท็บเล็ต | ช่างซ่อมสามารถติดตั้งเป็นแอปบนมือถือ พกพาไปตรวจงานหน้าเครื่องจักรได้สะดวก |
| **QR Code Scanner** | **html5-qrcode** | สแกน QR Code ผ่านกล้องเว็บแคมหรือกล้องมือถือได้โดยตรง | สแกนติดเร็วแม้ในสภาพแสงน้อยหน้าโรงงาน |
| **Image Optimizer** | **browser-image-compression** | บีบอัดรูปถ่ายความละเอียดสูงในเบราว์เซอร์ก่อนส่งขึ้นเซิร์ฟเวอร์ | ลดขนาดรูปจาก 10MB เหลือไม่เกิน 500KB ช่วยประหยัดพื้นที่จัดเก็บและอัปโหลดได้เร็วแม้เน็ตช้า |
| **Backend API** | **.NET 10 (C#)** | ประสิทธิภาพสูง รองรับงานประมวลผล Background Tasks ต่อเนื่อง | มั่นคง ปลอดภัย ทำงานร่วมกับ Coravel ได้อย่างไร้รอยต่อ |
| **Background Cron** | **Coravel Scheduler** | Lightweight Scheduler และ Invocables ในกระบวนการ .NET | ตรวจจับและแจ้งเตือน SLA Breached ทุกๆ 30 วินาที โดยไม่ต้องติดตั้ง Message Broker ภายนอก |
| **QR Code Engine** | **QRCoder** | สร้าง QR Code รูปภาพความละเอียดสูงสำหรับพิมพ์ติดป้ายเครื่องจักร | สร้าง QR Code แบบออฟไลน์ได้ทันที ไม่ต้องพึ่ง External API |

---

## 🚀 วิธีการรันระบบ (Quick Start)

### 1. รัน Backend API:
```powershell
cd cmms-api
dotnet run
```
> API พร้อมทำงานที่: `http://localhost:5020`

### 2. รัน Frontend Web:
```powershell
cd cmms-web
bun run dev
```
> เข้าใช้งานได้ที่: `http://localhost:3002`
