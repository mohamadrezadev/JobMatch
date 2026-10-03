import { IsOptional, IsString, IsInt } from 'class-validator';

export class SearchJobsDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsInt() page?: number;
  @IsOptional() @IsInt() limit?: number;
}
