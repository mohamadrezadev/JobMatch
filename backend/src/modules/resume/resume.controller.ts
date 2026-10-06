import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ResumeService } from "./resume.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  GenerateResumeDto,
  UpdateResumeDto,
  UpdateBaseResumeDto,
} from "./dto/resume.dto";

@Controller("api/resume")
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post("generate")
  async generate(@CurrentUser() user: any, @Body() dto: GenerateResumeDto) {
    return this.resumeService.generate(user.sub, dto.jobId);
  }

  @Get(":jobId")
  async getByJob(@CurrentUser() user: any, @Param("jobId") jobId: string) {
    return this.resumeService.getByJob(user.sub, jobId);
  }

  @Get(":jobId/pdf")
  async getPDF(
    @CurrentUser() user: any,
    @Param("jobId") jobId: string,
    @Res() response: Response,
  ) {
    response
      .type("application/pdf")
      .attachment("resume.pdf")
      .send(await this.resumeService.getPDF(user.sub, jobId));
  }
}

@Controller("api/resumes")
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(private readonly service: ResumeService) {}
  @Get("base")
  base(@CurrentUser() user: { sub: string }) {
    return this.service.getBase(user.sub);
  }
  @Put("base")
  saveBase(
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateBaseResumeDto,
  ) {
    return this.service.saveBase(user.sub, dto);
  }
  @Get("proposals")
  proposals(
    @CurrentUser() user: { sub: string },
    @Query("jobId") jobId: string,
  ) {
    return this.service.proposals(user.sub, jobId);
  }
  @Post("proposals/:id/accept")
  accept(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.service.acceptProposal(user.sub, id);
  }
  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.service.list(user.sub);
  }
  @Get(":id")
  get(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.service.getById(user.sub, id);
  }
  @Put(":id")
  update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.service.update(user.sub, id, dto);
  }
  @Get(":id/pdf")
  async pdf(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    response
      .type("application/pdf")
      .attachment("resume.pdf")
      .send(await this.service.pdfById(user.sub, id));
  }
}
