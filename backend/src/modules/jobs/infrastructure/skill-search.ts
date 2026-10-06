import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";

// Keep PostgreSQL-specific JSON matching in infrastructure. Values remain bound parameters.
export async function jobsWithSkills(
  prisma: PrismaService,
  skills: string[],
): Promise<string[]> {
  const checks = skills.map(
    (name) => Prisma.sql`EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof("requiredSkills") = 'array' THEN "requiredSkills" ELSE '[]'::jsonb END ||
      CASE WHEN jsonb_typeof("preferredSkills") = 'array' THEN "preferredSkills" ELSE '[]'::jsonb END
    ) AS skill
    WHERE lower(trim(CASE WHEN jsonb_typeof(skill) = 'string' THEN skill #>> '{}' ELSE skill ->> 'name' END)) = lower(trim(${name}))
  )`,
  );
  if (!checks.length) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT "id" FROM "jobs" WHERE ${Prisma.join(checks, " AND ")}`,
  );
  return rows.map((row) => row.id);
}
