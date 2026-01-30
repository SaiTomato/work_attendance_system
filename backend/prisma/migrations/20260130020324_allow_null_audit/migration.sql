-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_attendanceId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "attendanceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
