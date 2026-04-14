"use client";

import { useSearchParams } from "next/navigation";

export default function PredictionPage() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submissionId") ?? "-";
  const score = Number.parseInt(searchParams.get("score") ?? "0", 10);
  const totalQuestions = Number.parseInt(
    searchParams.get("totalQuestions") ?? "0",
    10,
  );
  const autoSubmitted = searchParams.get("autoSubmitted") === "1";

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 py-10">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">Hoàn thành bài thi</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Dữ liệu bài thi đã được ghi nhận thành công.
        </p>

        <div className="mt-5 space-y-1 text-sm text-zinc-700">
          <p>Mã bài nộp: {submissionId}</p>
          <p>
            Điểm tạm tính: {score}/{totalQuestions}
          </p>
          <p>Hình thức nộp: {autoSubmitted ? "Tự động khi hết giờ" : "Nộp thủ công"}</p>
        </div>
      </div>
    </main>
  );
}
