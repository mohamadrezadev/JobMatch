import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from "@nestjs/common";
import { isUUID } from "class-validator";

export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!isUUID(value)) {
      throw new BadRequestException("Invalid UUID");
    }
    return value;
  }
}
