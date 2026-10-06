import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { IsString, Matches, MaxLength } from "class-validator";
import { createHash, randomBytes } from "crypto";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { GuestChatService } from "../application/guest-chat.service";
import { ChatExceptionFilter } from "./chat-exception.filter";

class GuestMessageDto {
  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MaxLength(4000)
  @Matches(/\S/)
  message!: string;
}
const cookieName = "jobmatch_guest";
function token(request: Request) {
  const value = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@ApiTags("chat")
@Controller("api/chat/guest")
@UseFilters(ChatExceptionFilter)
export class GuestChatController {
  private readonly buckets = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(private readonly chat: GuestChatService) {}
  // Bound session-reset abuse without trusting proxy headers.
  private throttle(request: Request) {
    const now = Date.now();
    for (const [key, bucket] of this.buckets)
      if (bucket.until <= now) this.buckets.delete(key);
    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + 60000 };
    if (
      bucket.count >= 20 ||
      (this.buckets.size >= 10000 && !this.buckets.has(key))
    )
      throw new HttpException("Rate limited", 429);
    bucket.count++;
    this.buckets.set(key, bucket);
  }
  private checkOrigin(request: Request) {
    if (
      request.headers.origin &&
      request.headers.origin !==
        (process.env.CORS_ORIGIN || "http://localhost:3001")
    )
      throw new HttpException("Invalid origin", 403);
  }
  @Get()
  @ApiOperation({
    summary:
      "Restore the cookie-bound guest chat and remaining five-message allowance",
  })
  async get(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader("Cache-Control", "no-store");
    const raw = token(request);
    const data = await this.chat.get(raw ? hash(raw) : undefined);
    if (raw && !data.messages.length && data.remaining === 5)
      response.clearCookie(cookieName, {
        path: "/api/chat/guest",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    return {
      success: true,
      data,
    };
  }
  @Post("message")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Send a guest message; at most five successful turns per 24-hour session",
  })
  @ApiResponse({
    status: 403,
    description: "GUEST_LIMIT_REACHED: continue after authentication",
  })
  @ApiResponse({ status: 429, description: "Guest request rate exceeded" })
  async send(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: GuestMessageDto,
  ) {
    this.checkOrigin(request);
    this.throttle(request);
    const raw = token(request) ?? randomBytes(32).toString("hex");
    response.cookie(cookieName, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400000,
      path: "/api/chat/guest",
    });
    response.setHeader("Cache-Control", "no-store");
    return {
      success: true,
      data: await this.chat.send(hash(raw), dto.message.trim()),
    };
  }
  @Post("claim")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Atomically transfer the guest transcript and context to the authenticated owner",
  })
  async claim(
    @Req() request: Request,
    @CurrentUser() user: { sub: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    this.checkOrigin(request);
    const raw = token(request);
    const conversationId = raw
      ? await this.chat.claim(hash(raw), user.sub)
      : null;
    response.clearCookie(cookieName, {
      path: "/api/chat/guest",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    response.setHeader("Cache-Control", "no-store");
    return { success: true, data: { conversationId } };
  }
}
