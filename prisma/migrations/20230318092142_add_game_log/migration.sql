-- CreateTable
CREATE TABLE "GameLogSimple" (
    "id" TEXT NOT NULL,
    "game" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLogSimple_pkey" PRIMARY KEY ("id")
);
