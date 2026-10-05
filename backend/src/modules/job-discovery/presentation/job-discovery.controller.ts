import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  HttpCode,
  Post,
  UseFilters,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { HttpException } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JobDiscoveryService } from "../application/job-discovery.service";
import { DiscoveryError } from "../domain/discovery";

export class DiscoverJobsDto {
  @ApiProperty({
    format: "uuid",
    description: "Owned conversation; search context is read from the server",
  })
  @IsUUID()
  conversationId!: string;
}
@Catch()
export class DiscoveryExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status =
      error instanceof DiscoveryError
        ? error.status
        : error instanceof HttpException
          ? error.getStatus()
          : 500;
    const code =
      error instanceof DiscoveryError
        ? error.code
        : ((
            {
              400: "INVALID_REQUEST",
              401: "UNAUTHORIZED",
              429: "RATE_LIMITED",
            } as Record<number, string>
          )[status] ?? "JOB_DISCOVERY_UNAVAILABLE");
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        success: false,
        error: {
          code,
          message:
            "جستجوی فرصت‌ها انجام نشد؛ وضعیت دسترسی و درخواست را بررسی کنید.",
        },
      });
  }
}
@ApiTags("job-discovery")
@ApiBearerAuth()
@Controller("api/job-discovery")
@UseGuards(JwtAuthGuard)
@UseFilters(DiscoveryExceptionFilter)
export class JobDiscoveryController {
  private readonly limits = new Map<string, { count: number; until: number }>();
  constructor(private readonly discovery: JobDiscoveryService) {}
  @Get("conversations/:id/latest")
  @ApiOperation({
    summary:
      "Restore the last discovery result for the current owned conversation context",
  })
  async latest(
    @CurrentUser() user: { sub: string },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return { success: true, data: await this.discovery.latest(user.sub, id) };
  }
  @Post("search")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Discover Iranian jobs from the current context of an owned conversation",
  })
  @ApiResponse({
    status: 200,
    description:
      "runId, jobs, partial, sources and optional NO_JOBS_FOUND/cached",
  })
  @ApiResponse({
    status: 503,
    description:
      "Router/search/fetch provider unavailable or fetch security policy unverified",
  })
  @ApiResponse({
    status: 409,
    description: "Search for this conversation version already running",
  })
  async search(
    @CurrentUser() user: { sub: string },
    @Body() dto: DiscoverJobsDto,
  ) {
    const now = Date.now();
    for (const [key, limit] of this.limits)
      if (limit.until <= now) this.limits.delete(key);
    const limit = this.limits.get(user.sub) ?? { count: 0, until: now + 60000 };
    if (
      limit.count >= 5 ||
      (this.limits.size >= 10000 && !this.limits.has(user.sub))
    )
      throw new DiscoveryError("RATE_LIMITED", 429);
    limit.count++;
    this.limits.set(user.sub, limit);
    return {
      success: true,
      data: await this.discovery.search(user.sub, dto.conversationId),
    };
  }
}
