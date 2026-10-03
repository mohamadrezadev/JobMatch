import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { FeedbackRating, FeedbackReason } from '../feedback.enums';

export class SubmitFeedbackDto {
  @IsUUID()
  declare jobId: string;

  @IsEnum(FeedbackRating)
  declare rating: FeedbackRating;

  @IsOptional()
  @IsEnum(FeedbackReason)
  reason?: FeedbackReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
