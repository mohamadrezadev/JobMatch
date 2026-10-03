import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitFeedbackDto } from './dto/feedback.dto';

@Controller('api/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submit(
    @CurrentUser() user: any,
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.feedbackService.submit(user.sub, dto);
  }

  @Get(':jobId')
  async getForJob(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
  ) {
    return this.feedbackService.getHistoryForJob(user.sub, jobId);
  }
}
