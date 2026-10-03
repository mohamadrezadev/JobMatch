import { IsOptional, IsString, IsInt } from 'class-validator';

export class SearchJobsDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsInt() page?: number = 1;
  @IsOptional() @IsInt() limit?: number = 12;
}
