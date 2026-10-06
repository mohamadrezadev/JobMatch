import { Type } from "class-transformer";
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsNumber,
  MaxLength,
} from "class-validator";
import { WorkType, ExperienceLevel } from "../../users/dto/users.dto";

export class SearchJobsDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @IsString() @MaxLength(200) role?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;
  @IsOptional() @IsEnum(WorkType) workType?: WorkType;
  @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minimumSalary?: number;
  @IsOptional() @IsString() @MaxLength(1000) skills?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    12;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
