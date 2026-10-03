import { IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { FeedbackRating, FeedbackReason } from '../feedback.enums';

export class SubmitFeedbackDto {
  @IsUUID()
  jobId: string;

  @IsEnum(FeedbackRating)
  rating: FeedbackRating;

  @IsOptional()
  @IsEnum(FeedbackReason)
  reason?: FeedbackReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
