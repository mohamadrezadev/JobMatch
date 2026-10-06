import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { WorkType } from "./users.dto";
export class PreferencesDto {
  @IsOptional() @IsEnum(WorkType) workType?: WorkType;
  @IsOptional() @IsNumber() @Min(0) desiredSalary?: number;
  @IsOptional() @IsString() location?: string;
}
