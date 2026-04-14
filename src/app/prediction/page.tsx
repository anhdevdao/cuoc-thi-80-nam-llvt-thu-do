"use client";

import { useEffect, useState } from "react";

export default function PredictionPage() {
  const [submissionId, setSubmissionId] = useState("-");
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setSubmissionId(searchParams.get("submissionId") ?? "-");
    setScore(Number.parseInt(searchParams.get("score") ?? "0", 10));
    setTotalQuestions(Number.parseInt(searchParams.get("totalQuestions") ?? "0", 10));
    setAutoSubmitted(searchParams.get("autoSubmitted") === "1");
  }, []);

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
