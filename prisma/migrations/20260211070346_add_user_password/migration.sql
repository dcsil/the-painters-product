-- Delete demo user(s) that were created without a password (pre-auth data)
DELETE FROM "Upload" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'demo@example.com');
DELETE FROM "User" WHERE "email" = 'demo@example.com';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL;
