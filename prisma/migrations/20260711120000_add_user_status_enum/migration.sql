-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "User"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "UserStatus"
  USING (
    CASE
      WHEN "status" = 'INACTIVE' THEN 'INACTIVE'::"UserStatus"
      ELSE 'ACTIVE'::"UserStatus"
    END
  ),
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
