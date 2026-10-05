import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseFilters,
  BadRequestException,
} from "@nestjs/common";
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ChatRunService, terminal } from "./chat-run.service";
import { ChatExceptionFilter } from "../chat/presentation/chat-exception.filter";

export class CreateRunDto {
  @IsUUID() requestId!: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsUUID() retryOf?: string;
  @IsOptional() @IsString() @MaxLength(4000) @Matches(/\S/) message?: string;
}
@Controller("api/chat")
@UseGuards(JwtAuthGuard)
@UseFilters(ChatExceptionFilter)
export class ChatRunController {
  private readonly limits = new Map<string, { count: number; until: number }>();
  constructor(private readonly runs: ChatRunService) {}
  @Post("runs")
  @HttpCode(202)
  async create(
    @CurrentUser() user: { sub: string },
    @Body() input: CreateRunDto,
  ) {
    if (
      (!input.retryOf && !input.message) ||
      (input.retryOf && (input.message || input.conversationId))
    )
      throw new BadRequestException("Provide a message or retryOf");
    const now = Date.now();
    for (const [key, bucket] of this.limits)
      if (bucket.until <= now) this.limits.delete(key);
    const bucket = this.limits.get(user.sub) ?? {
      count: 0,
      until: now + 60000,
    };
    if (
      bucket.count >= 10 ||
      (this.limits.size >= 10000 && !this.limits.has(user.sub))
    )
      throw new HttpException("Rate limited", 429);
    bucket.count++;
    this.limits.set(user.sub, bucket);
    return { success: true, data: await this.runs.create(user.sub, input) };
  }
  @Get("conversations/:id/runs")
  async list(
    @CurrentUser() user: { sub: string },
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return { success: true, data: await this.runs.list(user.sub, id) };
  }
  @Get("runs/:id/events")
  async stream(
    @CurrentUser() user: { sub: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("last-event-id") lastId: string | undefined,
    @Query("after") after: string | undefined,
    @Req() _request: Request,
    @Res() response: Response,
  ) {
    let sequence = Number(lastId ?? after ?? 0);
    if (!Number.isSafeInteger(sequence) || sequence < 0)
      throw new BadRequestException("Invalid event sequence");
    await this.runs.owned(user.sub, id);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    let closed = false;
    let wake: (() => void) | undefined;
    const close = () => {
      closed = true;
      wake?.();
    };
    response.on("close", close);
    let lastHeartbeat = Date.now();
    try {
      while (!closed) {
        const replay = await this.runs.events(user.sub, id, sequence);
        for (const event of replay.events) {
          if (closed) break;
          const payload = {
            id: event.id,
            runId: id,
            sequence: event.sequence,
            type: event.type,
            timestamp: event.createdAt.toISOString(),
            data: event.data,
          };
          const writable = response.write(
            `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(payload)}\n\n`,
          );
          sequence = event.sequence;
          if (!writable)
            await new Promise<void>((resolve) => {
              const done = () => {
                response.off("drain", done);
                response.off("close", done);
                resolve();
              };
              response.once("drain", done);
              response.once("close", done);
            });
        }
        if (
          closed ||
          replay.finished ||
          (terminal(replay.status) && !replay.events.length)
        )
          break;
        if (Date.now() - lastHeartbeat >= 15000) {
          response.write(": heartbeat\n\n");
          lastHeartbeat = Date.now();
        }
        if (replay.events.length === 100) continue;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            wake = undefined;
            resolve();
          }, 250);
          wake = () => {
            clearTimeout(timer);
            wake = undefined;
            resolve();
          };
        });
      }
    } catch {
      /* A disconnected observer replays persisted events; never expose errors in SSE. */
    } finally {
      response.off("close", close);
      response.end();
    }
  }
}
