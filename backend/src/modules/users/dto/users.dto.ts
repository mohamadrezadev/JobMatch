import { IsOptional, IsString, IsEnum, IsNumber, IsArray } from 'class-validator';

export enum ExperienceLevel { JUNIOR = 'Junior', MID = 'Mid', SENIOR = 'Senior' }
export enum WorkType { REMOTE = 'Remote', ONSITE = 'On-site', HYBRID = 'Hybrid' }
export enum SkillLevel { BEGINNER = 'Beginner', INTERMEDIATE = 'Intermediate', ADVANCED = 'Advanced' }

export class UpdateProfileDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsNumber() desiredSalary?: number;
  @IsOptional() @IsNumber() experienceYears?: number;
  @IsOptional() @IsEnum(ExperienceLevel) experienceLevel?: ExperienceLevel;
  @IsOptional() @IsEnum(WorkType) workType?: WorkType;
  @IsOptional() @IsArray() socialLinks?: Record<string, string>;
}

export class AddSkillDto {
  @IsString()
  declare skillName: string;
  @IsOptional() @IsEnum(SkillLevel) level?: SkillLevel;
}
