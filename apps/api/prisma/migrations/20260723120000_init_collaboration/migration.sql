CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "currentSequence" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardSnapshot" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "sequence" BIGINT NOT NULL,
  "scene" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BoardOperation" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "sequence" BIGINT NOT NULL,
  "operationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoardOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Room_tokenHash_key" ON "Room"("tokenHash");
CREATE UNIQUE INDEX "BoardSnapshot_roomId_sequence_key" ON "BoardSnapshot"("roomId", "sequence");
CREATE INDEX "BoardSnapshot_roomId_sequence_idx" ON "BoardSnapshot"("roomId", "sequence" DESC);
CREATE UNIQUE INDEX "BoardOperation_roomId_sequence_key" ON "BoardOperation"("roomId", "sequence");
CREATE UNIQUE INDEX "BoardOperation_roomId_operationId_key" ON "BoardOperation"("roomId", "operationId");
CREATE INDEX "BoardOperation_roomId_sequence_idx" ON "BoardOperation"("roomId", "sequence");
CREATE INDEX "OutboxEvent_publishedAt_availableAt_idx" ON "OutboxEvent"("publishedAt", "availableAt");

ALTER TABLE "BoardSnapshot" ADD CONSTRAINT "BoardSnapshot_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardOperation" ADD CONSTRAINT "BoardOperation_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutboxEvent" ADD CONSTRAINT "OutboxEvent_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
