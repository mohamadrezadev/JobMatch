import { INestApplication, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtStrategy } from "../../src/modules/auth/jwt.strategy";
import { PrismaService } from "../../src/prisma/prisma.service";
import { JobsController } from "../../src/modules/jobs/jobs.controller";
import { JobsService } from "../../src/modules/jobs/jobs.service";
import { OnboardingController } from "../../src/modules/users/onboarding.controller";
import { UsersService } from "../../src/modules/users/users.service";
import { ResumesController } from "../../src/modules/resume/resume.controller";
import { ResumeService } from "../../src/modules/resume/resume.service";
import { renderResumePDF } from "../../src/modules/resume/pdf";

describe("MVP HTTP contracts with real validation/JWT and controlled services", () => {
  let app: INestApplication, base: string;
  const secret = "mvp-contract-tests-only";
  const token = new JwtService({ secret }).sign({
    sub: "owner",
    email: "owner@example.test",
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const jobs = {
    search: jest.fn().mockResolvedValue({ items: [], total: 0, pages: 0 }),
  };
  const users = { completeOnboarding: jest.fn() };
  const resumes = { getById: jest.fn(), pdfById: jest.fn() };
  beforeAll(async () => {
    @Module({
      controllers: [JobsController, OnboardingController, ResumesController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: async () => ({
                id: "owner",
                email: "owner@example.test",
              }),
            },
          },
        },
        { provide: JobsService, useValue: jobs },
        { provide: UsersService, useValue: users },
        { provide: ResumeService, useValue: resumes },
      ],
    })
    class TestModule {}
    app = await NestFactory.create(TestModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, "127.0.0.1");
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });
  it("requires authentication for personalized job search", async () => {
    expect((await fetch(`${base}/api/jobs/search`)).status).toBe(401);
  });
  it("accepts query filters and rejects invalid pages before the service", async () => {
    const result = await fetch(
      `${base}/api/jobs/search?q=Node&workType=OnSite&page=2&pageSize=20`,
      { headers },
    );
    expect(result.status).toBe(200);
    expect(jobs.search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Node",
        workType: "OnSite",
        page: 2,
        pageSize: 20,
      }),
      "owner",
    );
    expect(
      (await fetch(`${base}/api/jobs/search?page=0`, { headers })).status,
    ).toBe(400);
  });
  it("does not accept incomplete onboarding or unsupported work types", async () => {
    const response = await fetch(`${base}/api/onboarding/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workType: "Anywhere", skills: [] }),
    });
    expect(response.status).toBe(400);
    expect(users.completeOnboarding).not.toHaveBeenCalled();
  });
  it("returns a binary attachment rather than JSON for PDF downloads", async () => {
    resumes.pdfById.mockResolvedValue(
      await renderResumePDF({
        name: "نام کاربر",
        email: "owner@example.test",
        title: "Backend",
        location: "تهران",
        summary: "متن واقعی",
        highlights: [],
        skills_to_emphasize: ["Node.js"],
        experienceYears: 1,
      }),
    );
    const response = await fetch(`${base}/api/resumes/owned/pdf`, { headers });
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(
      Buffer.from(await response.arrayBuffer())
        .subarray(0, 5)
        .toString(),
    ).toBe("%PDF-");
    expect(resumes.pdfById).toHaveBeenCalledWith("owner", "owned");
  });
});
