"use client";

import { AlertTriangle } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  unansweredCount: number;
  onContinue: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  isOpen,
  unansweredCount,
  onContinue,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm transition-opacity duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition duration-200 ease-out">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">Xác nhận nộp bài</h2>
        </div>

        <p className="text-sm text-zinc-700">
          Bạn còn{" "}
          <span className="font-bold text-red-600">{unansweredCount} câu chưa trả lời</span>.
          Bạn có chắc chắn muốn chuyển sang phần dự đoán không?
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            Tiếp tục làm bài
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Vẫn nộp bài
          </button>
        </div>
      </div>
    </div>
  );
}
