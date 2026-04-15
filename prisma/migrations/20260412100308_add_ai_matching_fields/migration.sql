-- AlterTable
ALTER TABLE "JobMatch" ADD COLUMN "aiConfidence" REAL;
ALTER TABLE "JobMatch" ADD COLUMN "aiRecommendations" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "aiRiskAreas" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "aiStrengths" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "interviewQuestions" TEXT;
ALTER TABLE "JobMatch" ADD COLUMN "roleFit" TEXT;
