import { Module, INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { PrismaService } from "../../src/prisma/prisma.service";
import { JwtStrategy } from "../../src/modules/auth/jwt.strategy";
import { JwtAuthGuard } from "../../src/common/guards/jwt-auth.guard";
import { JobDiscoveryController } from "../../src/modules/job-discovery/presentation/job-discovery.controller";
import { JobDiscoveryService } from "../../src/modules/job-discovery/application/job-discovery.service";
import { PrismaDiscoveryRepository } from "../../src/modules/job-discovery/infrastructure/prisma-discovery.repository";
import { NineRouterClient } from "../../src/modules/job-discovery/infrastructure/nine-router.client";
import { NineRouterJobDiscoveryProvider } from "../../src/modules/job-discovery/infrastructure/nine-router-job-discovery.provider";
import { SourceValidator } from "../../src/modules/job-discovery/infrastructure/source-validator";
import { INITIAL_SOURCES } from "../../src/modules/job-discovery/domain/discovery";
import { DiscoveryResult } from "../../src/modules/job-discovery/domain/discovery";
import { DiscoveryError } from "../../src/modules/job-discovery/domain/discovery";
type Envelope = { data: DiscoveryResult; error: { code: string } };

// Explicit opt-in: normal integration runs never create records in a developer's database.
const databaseSuite =
  process.env.JOB_DISCOVERY_DB_TEST === "true" ? describe : describe.skip;
databaseSuite("Job discovery HTTP + mock 9Router + real PostgreSQL", () => {
  const marker = "Discovery fixture " + randomUUID();
  const secret = "integration-only-not-a-real-secret";
  let prisma: PrismaService,
    app: INestApplication,
    router: Server,
    base: string;
  let owner: string,
    other: string,
    conversationId: string,
    available = true,
    searchCount = 0;
  const fetched: string[] = [];
  let bridgeMode = false;
  const bridgeSources = new Map<string, string>();
  const jwt = new JwtService({ secret });
  const token = (id: string) =>
    jwt.sign({ sub: id, email: `${id}@example.test` }, { expiresIn: "1h" });
  const request = (body: unknown, id?: string) =>
    fetch(base + "/api/job-discovery/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(id ? { Authorization: "Bearer " + token(id) } : {}),
      },
      body: JSON.stringify(body),
    });
  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    owner = randomUUID();
    other = randomUUID();
    for (const id of [owner, other])
      await prisma.user.create({
        data: {
          id,
          email: `${id}@example.test`,
          password: "test-only",
          firstName: "Test",
          lastName: marker,
        },
      });
    const context = {
      searchContext: {
        targetRoles: ["Backend Developer"],
        workTypes: ["Remote"],
        excludedSkills: ["Python"],
        minimumSalary: 20000000,
      },
      candidateFacts: { skills: [], deniedSkills: [], statements: [] },
    };
    conversationId = (
      await prisma.conversation.create({
        data: { userId: owner, context, version: 1 },
      })
    ).id;
    router = createServer(async (req, res) => {
      let raw = "";
      for await (const part of req) raw += part;
      const body = raw ? JSON.parse(raw) : {};
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/v1/models/web")
        res.end(
          JSON.stringify({ data: available ? [{ id: "fixture/search" }] : [] }),
        );
      else if (req.url === "/v1/search") {
        searchCount++;
        const source = body.domain_filter[0];
        const bridge =
          "https://vertexaisearch.cloud.google.com/grounding-api-redirect/" +
          source.replace(/\./g, "_");
        bridgeSources.set(bridge, source);
        res.end(
          JSON.stringify({
            results: [
              {
                url: bridgeMode
                  ? bridge
                  : `https://${body.domain_filter[0]}/jobs/${owner}?utm_source=test`,
              },
              { url: "https://linkedin.com/jobs/forbidden" },
            ],
          }),
        );
      } else {
        fetched.push(body.url);
        if (bridgeMode && bridgeSources.has(body.url)) {
          const source = bridgeSources.get(body.url);
          res.end(
            JSON.stringify({
              url: body.url,
              final_url: `https://${source}/jobs`,
              links: [`/jobs/${owner}`, "https://linkedin.com/jobs/1"],
              content: { text: "Listing page" },
            }),
          );
          return;
        }
        const page = {
          "@type": "JobPosting",
          title: "Backend Node.js Developer",
          hiringOrganization: { name: marker },
          jobLocationType: "TELECOMMUTE",
          skills: "Node.js",
          description: "Build APIs",
          baseSalary: {
            currency: "IRR",
            value: {
              minValue: 250000000,
              maxValue: 350000000,
              unitText: "MONTH",
            },
          },
        };
        res.end(
          JSON.stringify({
            url: body.url,
            content: {
              text: `<script type="application/ld+json">${JSON.stringify(page)}</script>`,
            },
          }),
        );
      }
    });
    await new Promise<void>((resolve) =>
      router.listen(0, "127.0.0.1", resolve),
    );
    const validator = new SourceValidator(INITIAL_SOURCES);
    // Do not contact real sources in the fixture suite. Allowlisting remains real.
    jest.spyOn(validator, "resolve").mockImplementation(async (url) => url);
    jest.spyOn(validator, "resolveSearch").mockImplementation(async (url) => {
      if (validator.grounding(url))
        throw new DiscoveryError("SEARCH_LINK_UNRESOLVED", 502);
      return url;
    });
    jest
      .spyOn(validator, "validate")
      .mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    const provider = new NineRouterJobDiscoveryProvider(
      new NineRouterClient({
        baseUrl: `http://127.0.0.1:${(router.address() as AddressInfo).port}`,
        searchModel: "fixture/search",
        fetchModel: "fixture/fetch",
        fetchPolicyVerified: true,
        searchTimeout: 1000,
        fetchTimeout: 1000,
      }),
      validator,
      INITIAL_SOURCES,
    );
    const service = new JobDiscoveryService(
      new PrismaDiscoveryRepository(prisma),
      provider,
    );
    @Module({
      controllers: [JobDiscoveryController],
      providers: [
        { provide: JobDiscoveryService, useValue: service },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        JwtStrategy,
        JwtAuthGuard,
      ],
    })
    class FixtureModule {}
    app = await NestFactory.create(FixtureModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await app?.close();
    if (router)
      await new Promise<void>((resolve) => router.close(() => resolve()));
    if (prisma) {
      await prisma.job.deleteMany({ where: { company: marker } });
      await prisma.user.deleteMany({
        where: { id: { in: [owner, other].filter(Boolean) } },
      });
      await prisma.$disconnect();
    }
  });
  it("rejects unauthenticated and invalid payloads before discovery", async () => {
    expect((await request({ conversationId })).status).toBe(401);
    expect(
      (await request({ conversationId, sourceUrl: "http://127.0.0.1" }, owner))
        .status,
    ).toBe(400);
    expect(searchCount).toBe(0);
  });
  it("does not allow another owner to search or restore this conversation", async () => {
    expect((await request({ conversationId }, other)).status).toBe(404);
    expect(
      (
        await fetch(
          base + `/api/job-discovery/conversations/${conversationId}/latest`,
          { headers: { Authorization: "Bearer " + token(other) } },
        )
      ).status,
    ).toBe(404);
    expect(searchCount).toBe(0);
  });
  it("persists normalized results once, excludes foreign sources, restores and caches them", async () => {
    const response = await request({ conversationId }, owner);
    expect(response.status).toBe(200);
    const { data } = (await response.json()) as Envelope;
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0]).toMatchObject({
      company: marker,
      workType: "Remote",
      salaryMin: 25000000,
      currency: "TOMAN",
      salaryPeriod: "MONTHLY",
    });
    expect(data.jobs[0].sourceUrl).not.toContain("utm_source");
    expect(fetched).toHaveLength(4);
    expect(fetched.every((url) => !url.includes("linkedin"))).toBe(true);
    expect(await prisma.job.count({ where: { company: marker } })).toBe(1);
    const cached = await request({ conversationId }, owner);
    expect(((await cached.json()) as Envelope).data.cached).toBe(true);
    expect(searchCount).toBe(4);
    const latest = await fetch(
      base + `/api/job-discovery/conversations/${conversationId}/latest`,
      { headers: { Authorization: "Bearer " + token(owner) } },
    );
    expect(((await latest.json()) as Envelope).data.jobs[0].id).toBe(
      data.jobs[0].id,
    );
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { version: { increment: 1 } },
    });
    expect((await request({ conversationId }, owner)).status).toBe(200);
    expect(await prisma.job.count({ where: { company: marker } })).toBe(1);
  });
  it("persists jobs reached through verified bridge metadata and expanded listing links", async () => {
    bridgeMode = true;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { version: { increment: 1 } },
    });
    const before = fetched.length;
    const response = await request({ conversationId }, owner);
    expect(response.status).toBe(200);
    const { data } = (await response.json()) as Envelope;
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0].sourceUrl).not.toContain("google");
    expect(fetched.length - before).toBe(8);
    expect(await prisma.job.count({ where: { company: marker } })).toBe(1);
  });
  it("persists a failed run and leaves the conversation intact when provider disappears", async () => {
    available = false;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { version: { increment: 1 } },
    });
    const response = await request({ conversationId }, owner);
    expect(response.status).toBe(503);
    expect(((await response.json()) as Envelope).error.code).toBe(
      "JOB_SEARCH_PROVIDER_UNAVAILABLE",
    );
    expect(
      await prisma.jobDiscoveryRun.findFirst({
        where: { conversationId, status: "FAILED" },
      }),
    ).toMatchObject({ errorCode: "JOB_SEARCH_PROVIDER_UNAVAILABLE" });
    expect(
      await prisma.conversation.findUnique({ where: { id: conversationId } }),
    ).not.toBeNull();
  });
  it("retains safe source diagnostics with a failed run", async () => {
    const run = await prisma.jobDiscoveryRun.findFirstOrThrow({
      where: { conversationId, status: "FAILED" },
    });
    const sources = [
      {
        source: "jobvision.ir",
        query: "site:jobvision.ir Backend",
        found: 2,
        accepted: 0,
        rejected: 2,
        error: "TIMEOUT",
      },
    ];
    await new PrismaDiscoveryRepository(prisma).fail(
      run.id,
      "JOB_DISCOVERY_UNAVAILABLE",
      sources,
    );
    expect(
      await prisma.jobDiscoveryRun.findUnique({ where: { id: run.id } }),
    ).toMatchObject({ status: "FAILED", sourceReports: sources });
  });
});
