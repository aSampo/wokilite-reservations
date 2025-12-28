-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL
);

