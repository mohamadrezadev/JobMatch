"use client";

import { Card } from "@/components/ui/Card";
import type { MatchResult } from "@/types/job";

interface Props {
  result: MatchResult;
}

export function MatchScore({ result }: Props) {
  const { matchScore, breakdown } = result;
  if (matchScore == null)
    return (
      <Card>
        <p>
          {result.explanation ??
            "برای محاسبه تطابق، رزومه و اطلاعات واقعی خود را تکمیل کنید."}
        </p>
      </Card>
    );
  const color =
    matchScore >= 70
      ? "text-green-600"
      : matchScore >= 40
        ? "text-yellow-600"
        : "text-red-600";
  const bgColor =
    matchScore >= 70
      ? "bg-green-500"
      : matchScore >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <Card>
      <div className="flex items-center gap-6">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 36 36"
          >
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${matchScore} 100`}
              className={color}
              strokeLinecap="round"
            />
          </svg>
          <span className={`text-xl font-bold ${color}`}>{matchScore}%</span>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-gray-900">Match Breakdown</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${bgColor}`}
              />
                مهارت‌ها: <strong>{breakdown.skills.score == null ? "نامشخص" : `${breakdown.skills.score}٪`}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${bgColor}`}
              />
                سابقه: <strong>{breakdown.experience.score == null ? "نامشخص" : `${breakdown.experience.score}٪`}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${bgColor}`}
              />
                شهر: <strong>{breakdown.location.score == null ? "نامشخص" : `${breakdown.location.score}٪`}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${bgColor}`}
              />
                حقوق: <strong>{breakdown.salary.score == null ? "نامشخص" : `${breakdown.salary.score}٪`}</strong>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
