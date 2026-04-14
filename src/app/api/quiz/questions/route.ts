import { supabaseAdmin } from "@/lib/supabase";
import { getSystemDate } from "@/utils/dateUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const nowIso = getSystemDate().toISOString();
    const { data: activeTopics, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("id, title")
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
        { success: false, message: "Hiện không có chủ đề thi đang diễn ra." },
        { status: 404 },
      );
    }

    const { data: questions, error: questionError } = await supabaseAdmin
      .from("questions")
      .select("id, question_text, options")
      .eq("topic_id", activeTopic.id);

    if (questionError) {
      return Response.json(
        { success: false, message: questionError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      questions: questions ?? [],
    });
  } catch {
    return Response.json(
      { success: false, message: "Không thể tải danh sách câu hỏi." },
      { status: 500 },
    );
  }
}
