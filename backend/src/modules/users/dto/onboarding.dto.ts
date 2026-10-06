import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ExperienceLevel, SkillLevel, WorkType } from "./users.dto";

class OnboardingSkillDto {
  @IsString() @IsNotEmpty() @MaxLength(100) declare name: string;
  @IsEnum(SkillLevel) declare level: SkillLevel;
}

export class CompleteOnboardingDto {
  @IsString() @IsNotEmpty() @MaxLength(100) declare firstName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) declare lastName: string;
  @IsString() @IsNotEmpty() @MaxLength(200) declare title: string;
  @IsString() @IsNotEmpty() @MaxLength(200) declare location: string;
  @IsNumber() @Min(0) @Max(80) declare experienceYears: number;
  @IsEnum(ExperienceLevel) declare experienceLevel: ExperienceLevel;
  @IsEnum(WorkType) declare workType: WorkType;
  @IsOptional() @IsNumber() @Min(0) desiredSalary?: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OnboardingSkillDto)
  declare skills: OnboardingSkillDto[];
}
