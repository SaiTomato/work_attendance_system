/*
  Warnings:

  - You are about to drop the column `effectiveDate` on the `AttendanceRule` table. All the data in the column will be lost.
  - You are about to drop the column `revoked` on the `RefreshToken` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `attendanceId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `departmentId` on table `Employee` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'hr', 'viewer');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('STAFF', 'SUB_MANAGER', 'MANAGER', 'GENERAL_AFFAIRS', 'CEO');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('PROSPECTIVE', 'ACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "WorkLocation" AS ENUM ('OFFICE', 'REMOTE', 'WORKSITE');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_attendanceId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropIndex
DROP INDEX "Department_name_key";

-- AlterTable
ALTER TABLE "AttendanceRule" DROP COLUMN "effectiveDate",
ALTER COLUMN "standardCheckIn" DROP DEFAULT,
ALTER COLUMN "standardCheckOut" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "attendanceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "leaveEndDate" TIMESTAMP(3),
ADD COLUMN     "leaveStartDate" TIMESTAMP(3),
ADD COLUMN     "locationEndDate" TIMESTAMP(3),
ADD COLUMN     "locationStartDate" TIMESTAMP(3),
ADD COLUMN     "position" "Position" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'PROSPECTIVE',
ADD COLUMN     "terminationDate" TIMESTAMP(3),
ADD COLUMN     "workLocation" "WorkLocation" NOT NULL DEFAULT 'OFFICE',
ALTER COLUMN "departmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "revoked",
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'viewer';

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
