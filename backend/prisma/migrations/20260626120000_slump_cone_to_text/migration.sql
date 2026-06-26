-- Осадка конуса теперь хранится как текст: одиночное число «22» или диапазон «22-23».
-- USING ::text сохраняет существующие числовые значения (22 -> "22").
ALTER TABLE "Application" ALTER COLUMN "slumpCone" SET DATA TYPE TEXT USING "slumpCone"::text;
ALTER TABLE "PlumbLog" ALTER COLUMN "slumpCone" SET DATA TYPE TEXT USING "slumpCone"::text;
