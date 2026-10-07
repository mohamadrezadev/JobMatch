import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
  Optional,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { ChatService } from "../application/chat.service";
import { SendMessageDto } from "./send-message.dto";
import { ChatExceptionFilter } from "./chat-exception.filter";
import { randomUUID } from "crypto";
import { ChatAdmissionService } from "../../chat-admission/chat-admission.service";

@ApiTags("chat")
@ApiBearerAuth()
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 400, description: "Invalid input" })
@ApiResponse({ status: 404, description: "Owned conversation not found" })
@Controller("api/chat")
@UseGuards(JwtAuthGuard)
@UseFilters(ChatExceptionFilter)
export class ChatController {
  constructor(private readonly chat: ChatService, @Optional() private readonly admission?: ChatAdmissionService) {}
  @Post("message")
  @HttpCode(200)
  @ApiOperation({
    summary: "Persist a message and extract conversation context",
  })
  @ApiResponse({
    status: 200,
    description:
      "Conversation ID, assistant message, intent, searchContext, candidateFacts and readyForSearch in a success/data envelope",
  })
  @ApiResponse({
    status: 409,
    description: "Concurrent context update; retry request",
  })
  async send(
    @CurrentUser() user: { sub: string },
    @Body() dto: SendMessageDto,
  ) {
    const key = `user:${user.sub}`, lease = randomUUID();
    await this.admission?.reserve(key, lease);
    try { return {
      success: true,
      data: await this.chat.send(
        user.sub,
        dto.message.trim(),
        dto.conversationId,
      ),
    }; } finally { await this.admission?.release(key, lease, false); }
  }
  @Get("conversations")
  @ApiOperation({ summary: "List the latest 50 owned conversations" })
  async list(@CurrentUser() user: { sub: string }) {
    return { success: true, data: await this.chat.list(user.sub) };
  }
  @Get("conversations/:id")
  @ApiOperation({ summary: "Read owned conversation history" })
  async get(
    @CurrentUser() user: { sub: string },
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return { success: true, data: await this.chat.get(user.sub, id) };
  }
}
