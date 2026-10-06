import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
  ArrayMaxSize,
  MaxLength,
} from "class-validator";

export enum ExperienceLevel {
  JUNIOR = "Junior",
  MID = "Mid",
  SENIOR = "Senior",
}
export enum WorkType {
  REMOTE = "Remote",
  ONSITE = "On-site",
  ONSITE_CANONICAL = "OnSite",
  HYBRID = "Hybrid",
}
export enum SkillLevel {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate",
  ADVANCED = "Advanced",
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() @Min(0) desiredSalary?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(80) experienceYears?: number;
  @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
  @IsOptional() @IsEnum(WorkType) workType?: WorkType;
  @IsOptional() @IsObject() socialLinks?: Record<string, string>;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  resumeFacts?: string[];
}

export class AddSkillDto {
  @IsString()
  @MaxLength(100)
  declare skillName: string;
  @IsOptional() @IsEnum(SkillLevel) level?: SkillLevel;
}
