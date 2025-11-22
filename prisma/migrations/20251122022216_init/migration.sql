-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[];
