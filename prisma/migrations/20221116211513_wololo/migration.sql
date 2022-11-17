-- CreateTable
CREATE TABLE "Wololo" (
    "id" SERIAL NOT NULL,
    "trigger" TEXT NOT NULL,
    "wololo" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wololo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Wololo_wololo_key" ON "Wololo"("wololo");
