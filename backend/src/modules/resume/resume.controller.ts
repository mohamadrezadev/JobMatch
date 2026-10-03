import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GenerateResumeDto } from './dto/resume.dto';

@Controller('api/resume')
@UseGuards(JwtAuthGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate')
  async generate(
    @CurrentUser() user: any,
    @Body() dto: GenerateResumeDto,
  ) {
    return this.resumeService.generate(user.sub, dto.jobId);
  }

  @Get(':jobId')
  async getByJob(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.resumeService.getByJob(user.sub, jobId);
  }

  @Get(':jobId/pdf')
  async getPDF(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.resumeService.getPDF(user.sub, jobId);
  }
}
