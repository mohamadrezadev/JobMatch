import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from "class-validator";

export class SendMessageDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    maxLength: 4000,
    example: "یه کار بک‌اند Node دورکار بالای ۱۵ تومن می‌خوام",
  })
  @IsString()
  @MaxLength(4000)
  @Matches(/\S/, { message: "message must not be blank" })
  message!: string;
}
