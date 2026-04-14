"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ExternalLink } from "lucide-react";

type ApiResponse = {
  success: boolean;
  message: string;
};

type ExportRow = {
  id: string;
  cccd: string;
  full_name: string;
  phone: string;
  location: string;
  unit: string;
  specialty: string;
  topic_title: string;
  score: number;
  total_questions: number;
  prediction_count: number;
  created_at: string;
};

type ExportResponse = {
  success: boolean;
  message?: string;
  rows?: ExportRow[];
};

type RankingRow = {
  rank: number;
  id: string;
  full_name: string;
  cccd: string;
  topic_id: number;
  topic_title: string;
  score: number;
  prediction_count: number;
  deviation: number;
  duration: number;
  created_at: string;
};

type RankingResponse = {
  success: boolean;
  message?: string;
  rows?: RankingRow[];
  topics?: Array<{ id: number; title: string }>;
  selectedTopicId?: number | null;
  selectedTopicTitle?: string;
  currentTopicTotal?: number;
};

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

export default function AdminPage() {
  const topicQuestionSheetId =
    process.env.NEXT_PUBLIC_TOPIC_QUESTION_SHEET_ID ??
    "";
  const googleSheetUrl = topicQuestionSheetId
    ? `https://docs.google.com/spreadsheets/d/${topicQuestionSheetId}`
    : "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
  const [topicOptions, setTopicOptions] = useState<Array<{ id: number; title: string }>>(
    [],
  );
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState("");
  const [currentTopicTotal, setCurrentTopicTotal] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const requestAdminAction = async (action: "validate" | "sync") => {
    const response = await fetch("/api/admin/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-username": username,
        "x-admin-password": password,
      },
      body: JSON.stringify({ action }),
    });

    const payload = (await response.json()) as ApiResponse;
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Yêu cầu thất bại.");
    }

    return payload;
  };

  const formatDuration = (duration: number): string => {
    const safeDuration = Math.max(duration, 0);
    const minutes = Math.floor(safeDuration / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (safeDuration % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const loadRanking = async (topicId?: number | null) => {
    try {
      const query = new URLSearchParams();
      if (topicId) {
        query.set("topic_id", String(topicId));
      }

      const response = await fetch(`/api/admin/ranking?${query.toString()}`, {
        method: "GET",
        headers: {
          "x-admin-username": username,
          "x-admin-password": password,
        },
      });
      const payload = (await response.json()) as RankingResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Không thể tải bảng xếp hạng.");
      }
      setRankingRows(payload.rows ?? []);
      setTopicOptions(payload.topics ?? []);
      setSelectedTopicId(payload.selectedTopicId ?? null);
      setSelectedTopicTitle(payload.selectedTopicTitle ?? "");
      setCurrentTopicTotal(payload.currentTopicTotal ?? 0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải bảng xếp hạng.";
      showToast(message, "error");
    }
  };

  const exportExcel = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/export", {
        method: "GET",
        headers: {
          "x-admin-username": username,
          "x-admin-password": password,
        },
      });

      const payload = (await response.json()) as ExportResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Xuất dữ liệu thất bại.");
      }

      const rows = payload.rows ?? [];
      const worksheetData = rows.map((row) => ({
        "Mã bài nộp": row.id,
        "Số CCCD": row.cccd,
        "Họ và tên": row.full_name,
        "Số điện thoại": row.phone,
        "Địa phương": row.location,
        "Đơn vị": row.unit,
        "Chuyên môn": row.specialty,
        "Chủ đề": row.topic_title,
        "Điểm số": row.score,
        "Tổng số câu": row.total_questions,
        "Dự đoán số người": row.prediction_count,
        "Thời gian nộp": row.created_at,
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
      const fileData = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const blob = new Blob([fileData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `submissions-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(objectUrl);

      showToast("Xuất dữ liệu Excel thành công.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Xuất dữ liệu Excel thất bại.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = await requestAdminAction("validate");
      setIsAuthenticated(true);
      showToast(payload.message, "success");
      await loadRanking(selectedTopicId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng nhập thất bại.";
      setIsAuthenticated(false);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    setIsSubmitting(true);

    try {
      const payload = await requestAdminAction("sync");
      showToast(payload.message, "success");
      await loadRanking(selectedTopicId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đồng bộ dữ liệu thất bại.";
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadRanking(selectedTopicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, selectedTopicId]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-10">
      {toast ? (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Cập nhật câu hỏi và xuất toàn bộ kết quả thi.
        </p>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none ring-zinc-900 focus:ring-2"
                placeholder="Username"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none ring-zinc-900 focus:ring-2"
                placeholder="Password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang kiểm tra..." : "Đăng nhập"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-8">
            <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Quản trị hệ thống</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Thực hiện các tác vụ quản trị và xuất dữ liệu tổng.
              </p>

              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                <span className="font-medium text-zinc-700">Danh sách câu hỏi: </span>
                {googleSheetUrl ? (
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Nhấn để chỉnh sửa câu hỏi trực tiếp trên Google Sheets"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline decoration-emerald-500 underline-offset-2 transition hover:text-emerald-600"
                  >
                    Mở Google Sheets
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="text-zinc-500">Chưa cấu hình Sheet ID.</span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleSync}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Đang đồng bộ dữ liệu..."
                    : "Cập nhật danh sách câu hỏi từ Google Sheets"}
                </button>
                <button
                  onClick={exportExcel}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Đang xuất dữ liệu..." : "Xuất toàn bộ Excel"}
                </button>
              </div>
            </section>

            <hr className="border-zinc-200" />

            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-zinc-900">
                Bảng xếp hạng & Thống kê
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Dữ liệu phía dưới chỉ áp dụng cho chủ đề đang chọn.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Chọn chủ đề
                  </label>
                  <select
                    value={selectedTopicId ?? ""}
                    onChange={(event) =>
                      setSelectedTopicId(
                        event.target.value ? Number.parseInt(event.target.value, 10) : null,
                      )
                    }
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
                  >
                    {topicOptions.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => void loadRanking(selectedTopicId)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Làm mới bảng xếp hạng
                </button>
              </div>

              <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                Chủ đề: <span className="font-semibold">{selectedTopicTitle || "-"}</span> |
                Tổng số thí sinh đã tham gia:{" "}
                <span className="font-semibold">{currentTopicTotal}</span>
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-100 text-zinc-700">
                    <tr>
                      <th className="px-3 py-2">Hạng</th>
                      <th className="px-3 py-2">Họ và tên</th>
                      <th className="px-3 py-2">CCCD</th>
                      <th className="px-3 py-2">Chủ đề</th>
                      <th className="px-3 py-2">Điểm</th>
                      <th className="px-3 py-2">Dự đoán</th>
                      <th className="px-3 py-2">Sai số</th>
                      <th className="px-3 py-2">Thời gian làm</th>
                      <th className="px-3 py-2">Nộp lúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingRows.length ? (
                      rankingRows.map((row) => (
                        <tr key={row.id} className="border-t border-zinc-200">
                          <td className="px-3 py-2">{row.rank}</td>
                          <td className="px-3 py-2">{row.full_name}</td>
                          <td className="px-3 py-2">{row.cccd}</td>
                          <td className="px-3 py-2">{row.topic_title}</td>
                          <td className="px-3 py-2 font-semibold">{row.score}</td>
                          <td className="px-3 py-2">{row.prediction_count}</td>
                          <td className="px-3 py-2">
                            {row.deviation > 0 ? `+${row.deviation}` : row.deviation}
                          </td>
                          <td className="px-3 py-2">{formatDuration(row.duration)}</td>
                          <td className="px-3 py-2">
                            {new Date(row.created_at).toLocaleString("vi-VN")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-zinc-200">
                        <td colSpan={9} className="px-3 py-4 text-center text-zinc-500">
                          Chưa có dữ liệu bảng xếp hạng.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

      </div>
    </main>
  );
}
