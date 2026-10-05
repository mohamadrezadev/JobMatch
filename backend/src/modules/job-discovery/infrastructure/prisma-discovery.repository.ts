import { Injectable } from "@nestjs/common";
import { Prisma, Job } from "@prisma/client";
import { createHash } from "node:crypto";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  JobSearchIntent,
  ConversationContext,
} from "../../chat/domain/conversation";
import { DiscoveryRepository } from "../application/discovery.ports";
import {
  DiscoveredJob,
  DiscoveryError,
  DiscoveryJob,
  SourceReport,
  normalizeText,
} from "../domain/discovery";

const json = (value: unknown) => value as Prisma.InputJsonValue;
function view(row: Job): DiscoveryJob {
  const names = (value: unknown) =>
    Array.isArray(value)
      ? value.flatMap((skill) =>
          typeof skill === "string"
            ? [skill]
            : skill && typeof skill.name === "string"
              ? [skill.name]
              : [],
        )
      : [];
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    workType: row.workType,
    experienceLevel: row.experienceLevel,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    currency: row.currency as "TOMAN" | null,
    salaryPeriod: row.salaryPeriod as "MONTHLY" | null,
    description: row.description,
    requiredSkills: names(row.requiredSkills),
    preferredSkills: names(row.preferredSkills),
    source: row.source,
    sourceUrl: row.sourceUrl!,
    publishedAt: row.postedAt?.toISOString() ?? null,
    warnings: [
      !row.workType ? "نوع حضور اعلام نشده" : "",
      !row.location ? "شهر اعلام نشده" : "",
      row.salaryMin == null && row.salaryMax == null
        ? "حقوق در آگهی اعلام نشده"
        : "",
      row.salaryMin != null && !row.salaryPeriod
        ? "دوره پرداخت حقوق اعلام نشده"
        : "",
    ].filter(Boolean),
  };
}
@Injectable()
export class PrismaDiscoveryRepository extends DiscoveryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }
  async context(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) throw new DiscoveryError("CONVERSATION_NOT_FOUND", 404);
    return {
      intent: (conversation.context as unknown as ConversationContext)
        .searchContext,
      version: conversation.version,
    };
  }
  async latest(userId: string, conversationId: string) {
    const { version } = await this.context(userId, conversationId);
    const run = await this.prisma.jobDiscoveryRun.findFirst({
      where: {
        userId,
        conversationId,
        contextVersion: version,
        status: { in: ["COMPLETED", "PARTIAL"] },
      },
    });
    if (!run) return null;
    const ids = run.jobIds as string[];
    const rows = await this.prisma.job.findMany({ where: { id: { in: ids } } });
    return {
      runId: run.id,
      jobs: ids.flatMap((id) => {
        const row = rows.find((job) => job.id === id);
        return row ? [view(row)] : [];
      }),
      partial: run.status === "PARTIAL",
      sources: run.sourceReports as unknown as SourceReport[],
      ...(!ids.length ? { code: "NO_JOBS_FOUND" as const } : {}),
    };
  }
  async begin(
    userId: string,
    conversationId: string,
    contextVersion: number,
    intent: JobSearchIntent,
  ) {
    const where = {
      conversationId_contextVersion: { conversationId, contextVersion },
    };
    let run = await this.prisma.jobDiscoveryRun.findUnique({ where });
    if (
      run &&
      ["COMPLETED", "PARTIAL"].includes(run.status) &&
      Date.now() - run.startedAt.getTime() < 900000
    ) {
      const ids = run.jobIds as string[];
      const jobs = await this.prisma.job.findMany({
        where: { id: { in: ids } },
      });
      return {
        id: run.id,
        status: run.status,
        jobs: ids.flatMap((id) => {
          const job = jobs.find((row) => row.id === id);
          return job ? [view(job)] : [];
        }),
        sources: run.sourceReports as unknown as SourceReport[],
        cached: true,
      };
    }
    if (run) {
      if (
        run.status === "RUNNING" &&
        Date.now() - run.startedAt.getTime() < 75000
      )
        throw new DiscoveryError("JOB_SEARCH_IN_PROGRESS", 409);
      const updated = await this.prisma.jobDiscoveryRun.updateMany({
        where: { id: run.id, startedAt: run.startedAt, status: run.status },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          completedAt: null,
          errorCode: null,
          sourceReports: [],
          jobIds: [],
          resultCount: 0,
        },
      });
      if (updated.count !== 1)
        throw new DiscoveryError("JOB_SEARCH_IN_PROGRESS", 409);
    } else {
      try {
        run = await this.prisma.jobDiscoveryRun.create({
          data: {
            userId,
            conversationId,
            contextVersion,
            searchIntent: json(intent),
            status: "RUNNING",
            sourceReports: [],
            jobIds: [],
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new DiscoveryError("JOB_SEARCH_IN_PROGRESS", 409);
        throw error;
      }
    }
    return {
      id: run.id,
      status: "RUNNING",
      jobs: [],
      sources: [],
      cached: false,
    };
  }
  async complete(
    runId: string,
    candidates: DiscoveredJob[],
    sources: SourceReport[],
    partial: boolean,
  ) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const jobs: DiscoveryJob[] = [];
            for (const candidate of candidates) {
              const {
                publishedAt,
                requiredSkills,
                preferredSkills,
                ...fields
              } = candidate;
              const discoveryKey = createHash("sha256")
                .update(
                  [candidate.company, candidate.title, candidate.location ?? ""]
                    .map(normalizeText)
                    .join("|"),
                )
                .digest("hex");
              const existing = await tx.job.findFirst({
                where: {
                  OR: [{ sourceUrl: candidate.sourceUrl }, { discoveryKey }],
                },
              });
              const data = {
                ...fields,
                discoveryKey,
                postedAt: publishedAt ? new Date(publishedAt) : null,
                lastSeenAt: new Date(),
                requiredSkills: requiredSkills.map((name) => ({ name })),
                preferredSkills: preferredSkills.map((name) => ({ name })),
              };
              const row = existing
                ? await tx.job.update({ where: { id: existing.id }, data })
                : await tx.job.create({ data });
              jobs.push(view(row));
            }
            await tx.jobDiscoveryRun.update({
              where: { id: runId },
              data: {
                status: partial ? "PARTIAL" : "COMPLETED",
                completedAt: new Date(),
                resultCount: jobs.length,
                jobIds: jobs.map((job) => job.id),
                sourceReports: json(sources),
                errorCode: null,
              },
            });
            return {
              runId,
              jobs,
              partial,
              sources,
              ...(!jobs.length ? { code: "NO_JOBS_FOUND" as const } : {}),
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
          },
        );
      } catch (error) {
        if (
          attempt < 2 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2002", "P2034"].includes(error.code)
        )
          continue;
        throw error;
      }
    }
  }
  async saveCandidate(candidate: DiscoveredJob): Promise<DiscoveryJob> {
    const { publishedAt, requiredSkills, preferredSkills, ...fields } =
      candidate;
    const discoveryKey = createHash("sha256")
      .update(
        [candidate.company, candidate.title, candidate.location ?? ""]
          .map(normalizeText)
          .join("|"),
      )
      .digest("hex");
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const existing = await tx.job.findFirst({
              where: {
                OR: [{ sourceUrl: candidate.sourceUrl }, { discoveryKey }],
              },
            });
            const data = {
              ...fields,
              discoveryKey,
              postedAt: publishedAt ? new Date(publishedAt) : null,
              lastSeenAt: new Date(),
              requiredSkills: requiredSkills.map((name) => ({ name })),
              preferredSkills: preferredSkills.map((name) => ({ name })),
            };
            return view(
              existing
                ? await tx.job.update({ where: { id: existing.id }, data })
                : await tx.job.create({ data }),
            );
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          attempt < 2 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2002", "P2034"].includes(error.code)
        )
          continue;
        throw error;
      }
    }
  }
  async fail(runId: string, code: string, sources?: SourceReport[]) {
    await this.prisma.jobDiscoveryRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorCode: code,
        completedAt: new Date(),
        ...(sources ? { sourceReports: json(sources) } : {}),
      },
    });
  }
}
