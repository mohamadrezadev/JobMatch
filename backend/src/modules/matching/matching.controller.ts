import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post(':jobId')
  async getScore(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.matchingService.calculateMatch(user.sub, jobId);
  }

  @Get('explain/:jobId')
  async getExplanation(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.matchingService.explainMatch(user.sub, jobId);
  }

  @Get('gaps/:jobId')
  async getGaps(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.matchingService.getSkillGaps(user.sub, jobId);
  }
}
