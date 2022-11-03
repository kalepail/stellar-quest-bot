-- CreateTable
CREATE TABLE "VerifiedUser" (
    "id" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedUser_pkey" PRIMARY KEY ("id")
);
