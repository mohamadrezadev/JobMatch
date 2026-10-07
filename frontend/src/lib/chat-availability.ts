"use client";
import { useEffect, useState } from "react";
export interface ChatAvailability {
  active: boolean;
  activeRunId: string | null;
  nextAllowedAt: string;
  retryAfterSeconds: number;
}
export const chatRequestHint =
  "هر بار یک درخواست انجام می‌شود. بررسی منابع تا حدود یک دقیقه زمان دارد و ممکن است آگهی کمتری تأیید شود. بعد از جستجو، مکث کوتاهی برای درخواست بعدی داریم.";
export function useChatWait(availability?: ChatAvailability | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!availability) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [availability]);
  const seconds =
    Math.max(
      0,
      Math.ceil((Date.parse(availability?.nextAllowedAt ?? "") - now) / 1000),
    ) || 0;
  return { seconds, active: !!availability?.active && seconds > 0 };
}
export function admissionDetails(error: unknown): {
  message?: string;
  availability?: ChatAvailability;
} {
  const body = (
    error as {
      response?: {
        data?: { error?: Partial<ChatAvailability> & { message?: string } };
      };
    }
  )?.response?.data?.error;
  if (!body) return {};
  return {
    message: body.message,
    ...(typeof body.retryAfterSeconds === "number" &&
    typeof body.nextAllowedAt === "string"
      ? {
          availability: {
            active: !!body.active,
            activeRunId: body.activeRunId ?? null,
            nextAllowedAt: body.nextAllowedAt,
            retryAfterSeconds: body.retryAfterSeconds,
          },
        }
      : {}),
  };
}
