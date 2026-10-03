import { IsUUID } from 'class-validator';

export class GenerateResumeDto {
  @IsUUID()
  declare jobId: string;
}
