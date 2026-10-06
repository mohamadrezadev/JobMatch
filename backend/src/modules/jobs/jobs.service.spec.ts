import { JobsService } from "./jobs.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SearchJobsDto } from "./dto/jobs.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
describe("Server job search", () => {
  it("keeps search results available to a new owner without inventing personal scores", async () => {
    const db = {
      job: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: "job",
              requiredSkills: [{ name: "Excel" }],
              experienceLevel: "Junior",
              location: "تهران",
              workType: "OnSite",
            },
          ]),
        count: jest.fn().mockResolvedValue(1),
      },
      profile: { findUnique: jest.fn().mockResolvedValue(null) },
      userSkill: { findMany: jest.fn().mockResolvedValue([]) },
      resume: { count: jest.fn().mockResolvedValue(0) },
    };
    const response = await new JobsService(
      db as unknown as PrismaService,
    ).search({ page: 1, limit: 12 }, "owner");
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      id: "job",
      match: { matchScore: null, reason: "RESUME_REQUIRED" },
    });
    expect(db.resume.count).toHaveBeenCalledWith({
      where: { userId: "owner" },
    });
  });
  it("applies all conditions before skip/take and count", async () => {
    const db = {
      job: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(25),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: "matching-id" }]),
    };
    const service = new JobsService(db as unknown as PrismaService);
    const result = await service.search({
      page: 2,
      limit: 12,
      q: "Node",
      location: "tehran",
      workType: "Remote" as any,
      minimumSalary: 30000000,
      skills: "Node.js",
    });
    const query = db.job.findMany.mock.calls[0][0];
    expect(query.skip).toBe(12);
    expect(query.take).toBe(12);
    expect(query.where.AND).toContainEqual({
      salaryMin: { gte: 30000000 },
      currency: "TOMAN",
      salaryPeriod: "MONTHLY",
    });
    expect(query.where.AND).toContainEqual({ workType: "Remote" });
    expect(query.where.AND).toContainEqual({ id: { in: ["matching-id"] } });
    expect(db.job.count).toHaveBeenCalledWith({ where: query.where });
    expect(result.pages).toBe(3);
  });
  it("rejects invalid query sizes and transforms numeric strings", async () => {
    expect(
      await validate(
        plainToInstance(SearchJobsDto, { page: "-1", pageSize: "101" }),
      ),
    ).toHaveLength(2);
    expect(
      await validate(
        plainToInstance(SearchJobsDto, {
          page: "2",
          pageSize: "20",
          minimumSalary: "30000000",
        }),
      ),
    ).toHaveLength(0);
  });
});
