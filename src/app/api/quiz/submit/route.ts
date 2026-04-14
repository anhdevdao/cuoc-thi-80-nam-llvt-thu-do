import { supabaseAdmin } from "@/lib/supabase";
import { getSystemDate } from "@/utils/dateUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmitBody = {
  cccd?: string;
  full_name?: string;
  phone?: string;
  location?: string;
  unit?: string;
  specialty?: string;
  topic_id?: number;
  userAnswers?: Array<{ question_id: string; selected: "A" | "B" | "C" | "D" }>;
  prediction_count?: number;
  quiz_start_time?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitBody;
    const cccd = body.cccd?.trim() ?? "";
    const fullName = body.full_name?.trim() ?? "";
    const phone = (body.phone ?? "").replace(/\s+/g, "");
    const location = body.location?.trim() ?? "";
    const unit = body.unit?.trim() ?? location;
    const specialty = body.specialty?.trim() || "Khác";
    const topicId = body.topic_id;
    const userAnswers = body.userAnswers ?? [];
    const predictionCount = Number.isFinite(body.prediction_count)
      ? Number(body.prediction_count)
      : 0;
    const quizStartTimeInput = body.quiz_start_time?.trim() ?? "";

    if (!cccd || !fullName || !phone || !location || !topicId) {
      return Response.json(
        { success: false, message: "Thiếu thông tin thí sinh hoặc chủ đề thi." },
        { status: 400 },
      );
    }

    if (!/^\d{12}$/.test(cccd)) {
      return Response.json(
        { success: false, message: "Số CCCD phải gồm đúng 12 chữ số." },
        { status: 400 },
      );
    }

    if (!/^(0\d{9}|\+84\d{9})$/.test(phone)) {
      return Response.json(
        { success: false, message: "Số điện thoại không đúng định dạng." },
        { status: 400 },
      );
    }

    if (predictionCount < 0) {
      return Response.json(
        { success: false, message: "Số dự đoán phải là số không âm." },
        { status: 400 },
      );
    }

    if (specialty.length > 100) {
      return Response.json(
        { success: false, message: "Chuyên môn công tác quá dài." },
        { status: 400 },
      );
    }

    const parsedStartTime = new Date(quizStartTimeInput);
    if (!quizStartTimeInput || Number.isNaN(parsedStartTime.getTime())) {
      return Response.json(
        { success: false, message: "Thiếu hoặc sai định dạng quiz_start_time." },
        { status: 400 },
      );
    }

    const nowIso = getSystemDate().toISOString();
    const submitTime = new Date(nowIso);
    const durationSeconds = Math.max(
      Math.floor((submitTime.getTime() - parsedStartTime.getTime()) / 1000),
      0,
    );
    const { data: activeTopics, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("id")
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
    if (!activeTopic || activeTopic.id !== topicId) {
      return Response.json(
        { success: false, message: "Chủ đề thi hiện tại không hợp lệ." },
        { status: 400 },
      );
    }

    const { data: existingSubmission, error: existingError } = await supabaseAdmin
      .from("submissions")
      .select("id")
      .eq("cccd", cccd)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (existingError) {
      return Response.json(
        { success: false, message: existingError.message },
        { status: 500 },
      );
    }

    if (existingSubmission) {
      return Response.json(
        {
          success: false,
          message: "Bạn đã hoàn thành bài thi, vui lòng chờ kết quả từ ban tổ chức",
        },
        { status: 409 },
      );
    }

    const { data: questions, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("id, correct_answer")
      .eq("topic_id", topicId);

    if (questionError) {
      return Response.json(
        { success: false, message: questionError.message },
        { status: 500 },
      );
    }

    const questionList = questions ?? [];
    const totalQuestions = questionList.length;
    const answerMap = new Map(
      userAnswers.map((item) => [item.question_id, item.selected]),
    );

    let score = 0;
    for (const question of questionList) {
      if (answerMap.get(question.id) === question.correct_answer) {
        score += 1;
      }
    }

    const sanitizedAnswers = userAnswers.filter(
      (item) =>
        typeof item.question_id === "string" &&
        ["A", "B", "C", "D"].includes(item.selected),
    );

    const { data: insertedSubmission, error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert({
        cccd,
        full_name: fullName,
        phone,
        location,
        unit,
        specialty,
        topic_id: topicId,
        score,
        total_questions: totalQuestions,
        user_answers: sanitizedAnswers,
        prediction_count: predictionCount,
        quiz_start_time: parsedStartTime.toISOString(),
        duration: durationSeconds,
      })
      .select("id, score, total_questions, duration")
      .single();

    if (insertError) {
      return Response.json(
        { success: false, message: insertError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      submissionId: insertedSubmission.id,
      score: insertedSubmission.score,
      totalQuestions: insertedSubmission.total_questions,
      duration: insertedSubmission.duration,
      message: "Nộp bài thành công.",
    });
  } catch {
    return Response.json(
      { success: false, message: "Không thể chấm điểm bài thi." },
      { status: 500 },
    );
  }
}
