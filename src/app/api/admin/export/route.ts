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

  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, cccd, full_name, phone, location, unit, specialty, score, total_questions, prediction_count, created_at, topics(title)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    cccd: row.cccd,
    full_name: row.full_name,
    phone: row.phone,
    location: row.location,
    unit: row.unit,
    specialty: row.specialty,
    topic_title: Array.isArray(row.topics)
      ? row.topics[0]?.title ?? ""
      : row.topics?.title ?? "",
    score: row.score,
    total_questions: row.total_questions,
    prediction_count: row.prediction_count,
    created_at: row.created_at,
  }));

  return Response.json({
    success: true,
    rows,
  });
}
