import { supabaseAdmin } from "@/lib/supabase";
import { getSystemDate } from "@/utils/dateUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EligibilityBody = {
  cccd?: string;
  full_name?: string;
  phone?: string;
  location_unit?: string;
  specialty?: string | null;
};

const validatePayload = (body: EligibilityBody): string | null => {
  const cccd = body.cccd?.trim() ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const phone = (body.phone ?? "").replace(/\s+/g, "");
  const locationUnit = body.location_unit?.trim() ?? "";

  if (!cccd || !fullName || !phone || !locationUnit) {
    return "Vui lòng điền đầy đủ thông tin bắt buộc.";
  }

  if (!/^\d{12}$/.test(cccd)) {
    return "Số CCCD phải gồm đúng 12 chữ số.";
  }

  if (!/^(0\d{9}|\+84\d{9})$/.test(phone)) {
    return "Số điện thoại không đúng định dạng.";
  }

  if (body.specialty !== undefined && body.specialty !== null) {
    const specialty = body.specialty.trim();
    if (!specialty) {
      return "Chuyên môn công tác không hợp lệ.";
    }
    if (specialty.length > 100) {
      return "Chuyên môn công tác quá dài.";
    }
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EligibilityBody;
    const normalizedCccd = body.cccd?.trim() ?? "";
    const validationError = validatePayload(body);
    if (validationError) {
      return Response.json(
        { success: false, message: validationError },
        { status: 400 },
      );
    }

    const nowIso = getSystemDate().toISOString();
    const { data: activeTopics, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("id, title, start_date, end_date")
      .lte("start_date", nowIso)
      .gte("end_date", nowIso)
      .order("start_date", { ascending: false })
      .limit(1);

    if (topicError) {
      return Response.json(
        { success: false, message: topicError.message },
        { status: 500 },
      );
    }

    const activeTopic = activeTopics?.[0];
    if (!activeTopic) {
      return Response.json(
        {
          success: false,
          message: "Hiện không có chủ đề thi nào đang mở.",
        },
        { status: 404 },
      );
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("cccd", normalizedCccd)
      .eq("topic_id", activeTopic.id)
      .maybeSingle();

    if (submissionError) {
      return Response.json(
        { success: false, message: submissionError.message },
        { status: 500 },
      );
    }

    if (submission) {
      return Response.json({
        success: true,
        alreadySubmitted: true,
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        message: "Bạn đã hoàn thành bài thi, vui lòng chờ kết quả từ ban tổ chức",
      });
    }

    // Fallback: if this CCCD already has any historical submission, still block.
    const { data: anySubmission, error: anySubmissionError } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("cccd", normalizedCccd)
      .order("created_at", { ascending: false })
      .limit(1);

    if (anySubmissionError) {
      return Response.json(
        { success: false, message: anySubmissionError.message },
        { status: 500 },
      );
    }

    if ((anySubmission ?? []).length > 0) {
      return Response.json({
        success: true,
        alreadySubmitted: true,
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        message: "Bạn đã hoàn thành bài thi, vui lòng chờ kết quả từ ban tổ chức",
      });
    }

    return Response.json({
      success: true,
      alreadySubmitted: false,
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      message: "Đủ điều kiện vào thi.",
    });
  } catch {
    return Response.json(
      { success: false, message: "Không thể xử lý yêu cầu kiểm tra tư cách dự thi." },
      { status: 500 },
    );
  }
}
