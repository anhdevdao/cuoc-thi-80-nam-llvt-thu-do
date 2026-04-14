import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validateAdminCredentials = (request: Request): boolean => {
  const inputUsername = request.headers.get("x-admin-username") ?? "";
  const inputPassword = request.headers.get("x-admin-password") ?? "";
  const envUsername = process.env.ADMIN_USERNAME ?? "";
  const envPassword = process.env.ADMIN_PASSWORD ?? "";

  return inputUsername === envUsername && inputPassword === envPassword;
};

export async function GET(request: Request) {
  if (!validateAdminCredentials(request)) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const topicIdParam = searchParams.get("topic_id");

  const { data: topics, error: topicsError } = await supabaseAdmin
    .from("topics")
    .select("id, title")
    .order("id", { ascending: true });

  if (topicsError) {
    return Response.json(
      { success: false, message: topicsError.message },
      { status: 500 },
    );
  }

  const topicList = topics ?? [];
  const selectedTopicId =
    topicIdParam && Number.isFinite(Number.parseInt(topicIdParam, 10))
      ? Number.parseInt(topicIdParam, 10)
      : topicList[0]?.id;

  if (!selectedTopicId) {
    return Response.json({
      success: true,
      rows: [],
      topics: [],
      selectedTopicId: null,
      selectedTopicTitle: "",
      currentTopicTotal: 0,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, full_name, cccd, score, created_at, duration, prediction_count, topic_id, topics(title)",
    )
    .eq("topic_id", selectedTopicId);

  if (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  const currentTopicTotal = (data ?? []).length;

  const sortedRows = [...(data ?? [])].sort((a, b) => {
    const scoreDelta = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDelta !== 0) return scoreDelta;

    const aDeviation = Math.abs((a.prediction_count ?? 0) - currentTopicTotal);
    const bDeviation = Math.abs((b.prediction_count ?? 0) - currentTopicTotal);
    if (aDeviation !== bDeviation) return aDeviation - bDeviation;

    const durationDelta = (a.duration ?? 0) - (b.duration ?? 0);
    if (durationDelta !== 0) return durationDelta;

    return (
      new Date(a.created_at ?? "").getTime() - new Date(b.created_at ?? "").getTime()
    );
  });

  const rows = sortedRows.slice(0, 20).map((row, index) => {
    const topicSource = row.topics as { title?: string }[] | { title?: string } | null;
    const topicTitle = Array.isArray(topicSource)
      ? topicSource[0]?.title ?? ""
      : topicSource?.title ?? "";

    return {
      rank: index + 1,
      id: row.id,
      full_name: row.full_name,
      cccd: row.cccd,
      topic_id: row.topic_id,
      topic_title: topicTitle,
      score: row.score,
      prediction_count: row.prediction_count ?? 0,
      deviation: (row.prediction_count ?? 0) - currentTopicTotal,
      duration: row.duration ?? 0,
      created_at: row.created_at,
    };
  });

  const selectedTopicTitle =
    topicList.find((topic) => topic.id === selectedTopicId)?.title ?? "";

  return Response.json({
    success: true,
    rows,
    topics: topicList,
    selectedTopicId,
    selectedTopicTitle,
    currentTopicTotal,
  });
}
