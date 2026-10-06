import {
  IsUUID,
  IsString,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsOptional,
} from "class-validator";

export class GenerateResumeDto {
  @IsUUID()
  declare jobId: string;
}

export class UpdateResumeDto {
  @IsString() @MaxLength(10000) declare summary: string;
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  declare highlights: string[];
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  declare skills_to_emphasize: string[];
}
