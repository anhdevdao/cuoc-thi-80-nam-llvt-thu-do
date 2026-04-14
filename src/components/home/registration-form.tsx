"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSystemDate } from "@/utils/dateUtils";

type EligibilityResponse = {
  success: boolean;
  message: string;
  alreadySubmitted?: boolean;
  topicId?: number;
  topicTitle?: string;
};

type RegistrationFormProps = {
  bannerImageUrl: string;
};

type Specialty = "Quân đội" | "Công An" | "Khác" | "";

export default function RegistrationForm({
  bannerImageUrl,
}: RegistrationFormProps) {
  const router = useRouter();
  const [cccd, setCccd] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationUnit, setLocationUnit] = useState("");
  const [specialty, setSpecialty] = useState<Specialty>("");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyDoneMessage, setAlreadyDoneMessage] = useState("");

  const validateClientInput = (): string | null => {
    if (!/^\d{12}$/.test(cccd.trim())) {
      return "Số CCCD phải gồm đúng 12 chữ số.";
    }

    const normalizedPhone = phone.replace(/\s+/g, "");
    if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) {
      return "Số điện thoại không đúng định dạng.";
    }

    if (specialty === "Khác" && !customSpecialty.trim()) {
      return "Vui lòng nhập chuyên môn của bạn.";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setAlreadyDoneMessage("");

    const clientError = validateClientInput();
    if (clientError) {
      setErrorMessage(clientError);
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedSpecialty =
        specialty === "Khác" ? customSpecialty.trim() : specialty || null;

      const response = await fetch("/api/quiz/eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cccd: cccd.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          location_unit: locationUnit.trim(),
          specialty: normalizedSpecialty,
        }),
      });

      const payload = (await response.json()) as EligibilityResponse;

      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message || "Không thể kiểm tra tư cách dự thi.");
        return;
      }

      if (payload.alreadySubmitted) {
        setAlreadyDoneMessage(
          "Bạn đã hoàn thành bài thi, vui lòng chờ kết quả từ ban tổ chức",
        );
        return;
      }

      localStorage.setItem(
        "quiz_candidate",
        JSON.stringify({
          cccd: cccd.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          location: locationUnit.trim(),
          unit: locationUnit.trim(),
          specialty: normalizedSpecialty || "Khác",
          topic_id: payload.topicId,
          topic_title: payload.topicTitle,
          quiz_start_time: getSystemDate().toISOString(),
        }),
      );

      router.push("/quiz");
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi kết nối hệ thống.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="w-full bg-zinc-100">
          <img
            src={bannerImageUrl}
            alt="Banner cuộc thi"
            className="block h-auto w-full object-contain"
          />
        </div>

        <div className="p-5 sm:p-8">
          <h1 className="text-xl font-bold leading-snug text-zinc-900 sm:text-2xl md:text-3xl">
            Cuộc thi tìm hiểu 80 năm Truyền thống Lực lượng vũ trang Thủ đô
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Vui lòng điền đầy đủ thông tin để bắt đầu phần thi trực tuyến.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Số CCCD <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cccd}
                onChange={(event) => setCccd(event.target.value)}
                placeholder="Nhập 12 chữ số CCCD"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Họ và tên <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nhập họ và tên"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Số điện thoại <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Địa phương/Đơn vị <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={locationUnit}
                onChange={(event) => setLocationUnit(event.target.value)}
                placeholder="Nhập địa phương hoặc đơn vị công tác"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Chuyên môn công tác
              </label>
              <select
                value={specialty}
                onChange={(event) => {
                  const value = event.target.value as Specialty;
                  setSpecialty(value);
                  if (value !== "Khác") {
                    setCustomSpecialty("");
                  }
                }}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              >
                <option value="">Chọn chuyên môn (không bắt buộc)</option>
                <option value="Quân đội">Quân đội</option>
                <option value="Công An">Công An</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                specialty === "Khác" ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Chuyên môn khác <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={customSpecialty}
                onChange={(event) => setCustomSpecialty(event.target.value)}
                placeholder="Vui lòng nhập chuyên môn của bạn"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                required={specialty === "Khác"}
              />
            </div>

            {errorMessage ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Đang kiểm tra..." : "Vào thi"}
            </button>
          </form>
        </div>
      </div>

      {alreadyDoneMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Thông báo</h2>
            <p className="mt-3 text-sm text-zinc-700">{alreadyDoneMessage}</p>
            <button
              type="button"
              onClick={() => setAlreadyDoneMessage("")}
              className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
