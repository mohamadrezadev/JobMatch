import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { SearchJobsDto } from './dto/jobs.dto';

@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 12,
  ) {
    return this.jobsService.list(Number(page), Number(limit));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.jobsService.getById(id);
  }

  @Post('search')
  async search(@Body() dto: SearchJobsDto) {
    return this.jobsService.search(dto.keyword, dto.page, dto.limit);
  }

  @Get('recommended')
  async recommended() {
    return this.jobsService.getRecommended();
  }
}
