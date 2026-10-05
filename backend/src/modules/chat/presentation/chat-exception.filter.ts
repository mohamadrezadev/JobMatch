import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import {
  GuestLimitReached,
  GuestSessionUnavailable,
} from "../domain/guest-conversation";
import {
  ConversationConflict,
  ConversationNotFound,
} from "../domain/conversation";

@Catch()
export class ChatExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const status =
      error instanceof GuestLimitReached ||
      error instanceof GuestSessionUnavailable
        ? 403
        : error instanceof ConversationNotFound
          ? 404
          : error instanceof ConversationConflict
            ? 409
            : error instanceof HttpException
              ? error.getStatus()
              : 500;
    const codes: Record<number, string> = {
      400: "INVALID_REQUEST",
      401: "UNAUTHORIZED",
      404: "CONVERSATION_NOT_FOUND",
      409: "CONVERSATION_CONFLICT",
      429: "RATE_LIMITED",
      403:
        error instanceof GuestLimitReached
          ? "GUEST_LIMIT_REACHED"
          : "GUEST_SESSION_UNAVAILABLE",
    };
    const messages: Record<number, string> = {
      400: "درخواست معتبر نیست؛ پیام و شناسه گفتگو را بررسی کنید.",
      401: "برای گفتگو وارد حساب شوید.",
      404: "گفتگو پیدا نشد.",
      409: "گفتگو تغییر کرده است؛ دوباره تلاش کنید.",
      403:
        error instanceof GuestLimitReached
          ? "برای ادامه گفتگو وارد شوید یا ثبت‌نام کنید."
          : "این نشست مهمان در دسترس نیست؛ وارد حساب شوید.",
      429: "تعداد درخواست‌ها زیاد است؛ یک دقیقه بعد دوباره تلاش کنید.",
    };
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({
        success: false,
        error: {
          code: codes[status] ?? "INTERNAL_ERROR",
          message: messages[status] ?? "خطایی در پردازش گفتگو رخ داد.",
        },
      });
  }
}
