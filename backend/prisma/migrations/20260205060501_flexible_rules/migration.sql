-- AlterTable
ALTER TABLE "AttendanceRule" ADD COLUMN     "allowedCheckInStart" TEXT NOT NULL DEFAULT '05:00',
ADD COLUMN     "maxOvertimeHours" INTEGER NOT NULL DEFAULT 3;
