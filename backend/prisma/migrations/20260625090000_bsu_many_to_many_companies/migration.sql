-- BSU: переход с одиночной компании (companyId) на many-to-many (companies).
-- Порядок важен: сначала создаём junction-таблицу и переносим существующие
-- связи, и только потом удаляем колонку companyId — чтобы не потерять данные.

-- CreateTable
CREATE TABLE "_BsuToCompany" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_BsuToCompany_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BsuToCompany_B_index" ON "_BsuToCompany"("B");

-- AddForeignKey
ALTER TABLE "_BsuToCompany" ADD CONSTRAINT "_BsuToCompany_A_fkey" FOREIGN KEY ("A") REFERENCES "Bsu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BsuToCompany" ADD CONSTRAINT "_BsuToCompany_B_fkey" FOREIGN KEY ("B") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: перенос старых связей Bsu.companyId -> _BsuToCompany (A=Bsu, B=Company)
INSERT INTO "_BsuToCompany" ("A", "B")
SELECT "id", "companyId" FROM "Bsu"
WHERE "companyId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Bsu" DROP CONSTRAINT "Bsu_companyId_fkey";

-- AlterTable
ALTER TABLE "Bsu" DROP COLUMN "companyId";
