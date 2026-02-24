/*
  Warnings:

  - The values [ON_LEAVE,TERMINATED] on the enum `EmployeeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `checkInTime` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutTime` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `employeeName` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `workHours` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `absentThreshold` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `allowedCheckInStart` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `lateGracePeriod` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `maxOvertimeHours` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `terminationDate` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Holiday` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AttendanceRuleToEmployee` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[employeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recorder` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DutyStatus" AS ENUM ('NORMAL', 'PAID_LEAVE', 'UNPAID_LEAVE');

-- AlterEnum
BEGIN;
CREATE TYPE "EmployeeStatus_new" AS ENUM ('PROSPECTIVE', 'ACTIVE', 'RESIGNED');
ALTER TABLE "public"."Employee" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Employee" ALTER COLUMN "status" TYPE "EmployeeStatus_new" USING ("status"::text::"EmployeeStatus_new");
ALTER TYPE "EmployeeStatus" RENAME TO "EmployeeStatus_old";
ALTER TYPE "EmployeeStatus_new" RENAME TO "EmployeeStatus";
DROP TYPE "public"."EmployeeStatus_old";
ALTER TABLE "Employee" ALTER COLUMN "status" SET DEFAULT 'PROSPECTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "AttendanceRule" DROP CONSTRAINT "AttendanceRule_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_attendanceId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_userId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "_AttendanceRuleToEmployee" DROP CONSTRAINT "_AttendanceRuleToEmployee_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttendanceRuleToEmployee" DROP CONSTRAINT "_AttendanceRuleToEmployee_B_fkey";

-- DropIndex
DROP INDEX "Employee_userId_key";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "checkInTime",
DROP COLUMN "checkOutTime",
DROP COLUMN "createdAt",
DROP COLUMN "date",
DROP COLUMN "deletedAt",
DROP COLUMN "employeeName",
DROP COLUMN "updatedAt",
DROP COLUMN "workHours",
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "recordTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "recorder" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AttendanceRule" DROP COLUMN "absentThreshold",
DROP COLUMN "allowedCheckInStart",
DROP COLUMN "createdAt",
DROP COLUMN "departmentId",
DROP COLUMN "lateGracePeriod",
DROP COLUMN "maxOvertimeHours",
DROP COLUMN "updatedAt",
ADD COLUMN     "autoCheckoutTime" TEXT NOT NULL DEFAULT '20:00',
ADD COLUMN     "windowEnd" TEXT NOT NULL DEFAULT '14:00',
ADD COLUMN     "windowStart" TEXT NOT NULL DEFAULT '07:00';

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "terminationDate",
DROP COLUMN "userId",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dutyStatus" "DutyStatus" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "dutyStatusEndDate" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "departmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT;

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "Holiday";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "_AttendanceRuleToEmployee";

-- DropEnum
DROP TYPE "ApprovalStatus";

-- DropEnum
DROP TYPE "LeaveType";

-- CreateIndex
CREATE INDEX "Attendance_employeeId_recordTime_idx" ON "Attendance"("employeeId", "recordTime");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("employeeId") ON DELETE SET NULL ON UPDATE CASCADE;
