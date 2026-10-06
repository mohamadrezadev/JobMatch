import { PrismaDiscoveryRepository } from "./prisma-discovery.repository";
import { PrismaService } from "../../../prisma/prisma.service";

describe("discovery retry cache", () => {
  const intent = { targetRoles: ["حسابدار"] };
  function setup(status: string, jobIds: string[] = []) {
    const prisma = {
      jobDiscoveryRun: {
        findUnique: jest.fn(async () => ({
          id: "run",
          status,
          startedAt: new Date(),
          jobIds,
          sourceReports: [],
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      job: { findMany: jest.fn(async () => []) },
    };
    return {
      prisma,
      repository: new PrismaDiscoveryRepository(
        prisma as unknown as PrismaService,
      ),
    };
  }
  it("retries an incomplete empty search instead of replaying it for fifteen minutes", async () => {
    const { repository, prisma } = setup("PARTIAL");
    const result = await repository.begin("user", "conversation", 1, intent);
    expect(result.cached).toBe(false);
    expect(prisma.jobDiscoveryRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RUNNING", jobIds: [] }),
      }),
    );
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });
  it.each([
    ["COMPLETED", []],
    ["PARTIAL", ["job"]],
  ])(
    "preserves caching for %s searches with usable results or a complete empty search",
    async (status, jobIds) => {
      const { repository, prisma } = setup(
        status as string,
        jobIds as string[],
      );
      expect(
        (await repository.begin("user", "conversation", 1, intent)).cached,
      ).toBe(true);
      expect(prisma.jobDiscoveryRun.updateMany).not.toHaveBeenCalled();
    },
  );
});
