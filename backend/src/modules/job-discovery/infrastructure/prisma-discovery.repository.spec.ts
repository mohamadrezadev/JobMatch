import { PrismaDiscoveryRepository } from "./prisma-discovery.repository";
import { PrismaService } from "../../../prisma/prisma.service";
import { DiscoveryError } from "../domain/discovery";

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

describe("candidate lifecycle persistence", () => {
  function setupCandidates() {
    const rows: unknown[] = [];
    const prisma = {
      jobDiscoveryCandidate: {
        findUnique: jest.fn(async () => null),
        upsert: jest.fn(async (args) => {
          rows.push(args);
          return {};
        }),
        findMany: jest.fn(async () => []),
      },
      jobDiscoveryRun: {
        findFirst: jest.fn(async () => ({ id: "run", userId: "user" })),
      },
    };
    return {
      prisma,
      rows,
      repository: new PrismaDiscoveryRepository(
        prisma as unknown as PrismaService,
      ),
    };
  }
  it("upserts a candidate keyed by run and canonical URL", async () => {
    const { repository, prisma } = setupCandidates();
    await repository.recordCandidate("run", {
      source: "jobvision.ir",
      url: "https://jobvision.ir/jobs/1",
      status: "MATCHED",
    });
    expect(prisma.jobDiscoveryCandidate.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId_canonicalUrl: {
            runId: "run",
            canonicalUrl: "https://jobvision.ir/jobs/1",
          },
        },
        create: expect.objectContaining({ status: "MATCHED" }),
        update: expect.objectContaining({
          status: "MATCHED",
          retryCount: { increment: 1 },
        }),
      }),
    );
  });
  it("never downgrades an already-MATCHED candidate", async () => {
    const { repository, prisma } = setupCandidates();
    prisma.jobDiscoveryCandidate.findUnique.mockResolvedValueOnce({
      status: "MATCHED",
    } as never);
    await repository.recordCandidate("run", {
      source: "jobvision.ir",
      url: "https://jobvision.ir/jobs/1",
      status: "REJECTED",
      errorCode: "DUPLICATE",
    });
    expect(prisma.jobDiscoveryCandidate.upsert).not.toHaveBeenCalled();
  });
  it("rejects listing candidates for a run the user does not own", async () => {
    const { repository, prisma } = setupCandidates();
    prisma.jobDiscoveryRun.findFirst.mockImplementationOnce(
      async () => null as unknown as { id: string; userId: string },
    );
    await expect(
      repository.listCandidates("someone-else", "run"),
    ).rejects.toBeInstanceOf(DiscoveryError);
  });
  it("paginates and filters by status", async () => {
    const { repository, prisma } = setupCandidates();
    const row = (id: string, status: string) => ({
      id,
      runId: "run",
      source: "jobvision.ir",
      canonicalUrl: `https://jobvision.ir/jobs/${id}`,
      status,
      errorCode: null,
      stage: null,
      discoveredAt: new Date(),
      lastAttemptAt: new Date(),
      retryCount: 0,
    });
    prisma.jobDiscoveryCandidate.findMany.mockImplementationOnce(
      async () => [row("1", "REJECTED"), row("2", "REJECTED")] as never[],
    );
    const result = await repository.listCandidates("user", "run", {
      status: "REJECTED",
      limit: 1,
    });
    expect(prisma.jobDiscoveryCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId: "run",
          OR: [{ errorCode: null }, { errorCode: { not: "SOURCE_REJECTED" } }],
          status: "REJECTED",
        },
        take: 2,
      }),
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.nextCursor).toBe("1");
  });
  it("defaults invalid limits and excludes source-rejected URLs", async () => {
    const { repository, prisma } = setupCandidates();
    await repository.listCandidates("user", "run", { limit: Number.NaN });
    expect(prisma.jobDiscoveryCandidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId: "run",
          OR: [{ errorCode: null }, { errorCode: { not: "SOURCE_REJECTED" } }],
        },
        take: 51,
      }),
    );
  });
});
