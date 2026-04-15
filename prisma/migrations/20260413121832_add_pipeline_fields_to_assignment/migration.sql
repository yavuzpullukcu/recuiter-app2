-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "contactTitle" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "status" TEXT DEFAULT 'CV Gönderildi';
