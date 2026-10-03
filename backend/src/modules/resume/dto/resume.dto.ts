import { IsUUID } from 'class-validator';

export class GenerateResumeDto {
  @IsUUID()
  jobId: string;
}
