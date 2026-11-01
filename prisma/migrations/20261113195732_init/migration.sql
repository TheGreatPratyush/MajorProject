-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STARTUP', 'INVESTOR', 'INCUBATOR', 'ACCELERATOR', 'MENTOR', 'GOVERNMENT', 'PUBLIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AyushCategory" AS ENUM ('AYURVEDA', 'YOGA_NATUROPATHY', 'UNANI', 'SIDDHA', 'SOWA_RIGPA', 'HOMOEOPATHY', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "StartupStage" AS ENUM ('IDEA', 'PRE_SEED', 'EARLY_STAGE', 'GROWTH', 'ESTABLISHED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('ANGEL', 'VENTURE_CAPITAL', 'PRIVATE_EQUITY', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "MentorAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProgramApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('GOVERNMENT_SCHEME', 'FUNDING', 'REGULATORY_GUIDELINE', 'RESEARCH', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('WEBINAR', 'WORKSHOP', 'CONFERENCE', 'NETWORKING', 'OTHER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONNECTION', 'MENTORSHIP', 'APPLICATION', 'EVENT', 'SYSTEM', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startupName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AyushCategory" NOT NULL,
    "stage" "StartupStage" NOT NULL,
    "foundedYear" INTEGER,
    "location" TEXT,
    "website" TEXT,
    "productDescription" TEXT,
    "fundingRequired" DECIMAL(14,2),
    "teamSize" INTEGER,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartupProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "investorType" "InvestorType" NOT NULL,
    "description" TEXT,
    "investmentInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredCategories" "AyushCategory"[] DEFAULT ARRAY[]::"AyushCategory"[],
    "preferredStages" "StartupStage"[] DEFAULT ARRAY[]::"StartupStage"[],
    "minInvestment" DECIMAL(14,2),
    "maxInvestment" DECIMAL(14,2),
    "location" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER,
    "biography" TEXT,
    "availabilityStatus" "MentorAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "areasOfInterest" "AyushCategory"[] DEFAULT ARRAY[]::"AyushCategory"[],
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncubatorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supportedCategories" "AyushCategory"[] DEFAULT ARRAY[]::"AyushCategory"[],
    "location" TEXT,
    "website" TEXT,
    "programsOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncubatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcceleratorProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specialization" TEXT,
    "location" TEXT,
    "website" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcceleratorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "departmentName" TEXT NOT NULL,
    "designation" TEXT,
    "description" TEXT,
    "officialWebsite" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "message" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorshipApplication" (
    "id" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "mentorId" UUID NOT NULL,
    "message" TEXT,
    "goals" TEXT,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncubationProgram" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "programName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibility" TEXT,
    "category" "AyushCategory",
    "durationDays" INTEGER,
    "deadline" TIMESTAMP(3),
    "status" "ProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncubationProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramApplication" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "startupId" UUID NOT NULL,
    "message" TEXT,
    "status" "ProgramApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publisherId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "location" TEXT,
    "onlineMeetingUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "capacity" INTEGER,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "registrationStatus" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'OTHER',
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StartupProfile_userId_key" ON "StartupProfile"("userId");

-- CreateIndex
CREATE INDEX "StartupProfile_category_stage_idx" ON "StartupProfile"("category", "stage");

-- CreateIndex
CREATE INDEX "StartupProfile_location_idx" ON "StartupProfile"("location");

-- CreateIndex
CREATE INDEX "StartupProfile_verificationStatus_idx" ON "StartupProfile"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "InvestorProfile"("userId");

-- CreateIndex
CREATE INDEX "InvestorProfile_investorType_idx" ON "InvestorProfile"("investorType");

-- CreateIndex
CREATE INDEX "InvestorProfile_location_idx" ON "InvestorProfile"("location");

-- CreateIndex
CREATE UNIQUE INDEX "MentorProfile_userId_key" ON "MentorProfile"("userId");

-- CreateIndex
CREATE INDEX "MentorProfile_availabilityStatus_idx" ON "MentorProfile"("availabilityStatus");

-- CreateIndex
CREATE UNIQUE INDEX "IncubatorProfile_userId_key" ON "IncubatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AcceleratorProfile_userId_key" ON "AcceleratorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentProfile_userId_key" ON "GovernmentProfile"("userId");

-- CreateIndex
CREATE INDEX "ConnectionRequest_receiverId_status_idx" ON "ConnectionRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "ConnectionRequest_senderId_status_idx" ON "ConnectionRequest"("senderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_senderId_receiverId_key" ON "ConnectionRequest"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "MentorshipApplication_applicantId_status_idx" ON "MentorshipApplication"("applicantId", "status");

-- CreateIndex
CREATE INDEX "MentorshipApplication_mentorId_status_idx" ON "MentorshipApplication"("mentorId", "status");

-- CreateIndex
CREATE INDEX "IncubationProgram_ownerId_status_idx" ON "IncubationProgram"("ownerId", "status");

-- CreateIndex
CREATE INDEX "IncubationProgram_status_deadline_idx" ON "IncubationProgram"("status", "deadline");

-- CreateIndex
CREATE INDEX "ProgramApplication_startupId_status_idx" ON "ProgramApplication"("startupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramApplication_programId_startupId_key" ON "ProgramApplication"("programId", "startupId");

-- CreateIndex
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

-- CreateIndex
CREATE INDEX "Resource_publishedAt_idx" ON "Resource"("publishedAt");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_status_startDate_idx" ON "Event"("status", "startDate");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_status_createdAt_idx" ON "CommunityPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "StartupProfile" ADD CONSTRAINT "StartupProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorProfile" ADD CONSTRAINT "MentorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncubatorProfile" ADD CONSTRAINT "IncubatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcceleratorProfile" ADD CONSTRAINT "AcceleratorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentProfile" ADD CONSTRAINT "GovernmentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorshipApplication" ADD CONSTRAINT "MentorshipApplication_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncubationProgram" ADD CONSTRAINT "IncubationProgram_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramApplication" ADD CONSTRAINT "ProgramApplication_programId_fkey" FOREIGN KEY ("programId") REFERENCES "IncubationProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramApplication" ADD CONSTRAINT "ProgramApplication_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
