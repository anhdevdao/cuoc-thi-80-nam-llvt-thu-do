import Papa from "papaparse";

import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CsvRow = Record<string, string>;

type QuestionInsert = {
  topic_id: number;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer?: string;
};

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const normalizeKey = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getField = (row: CsvRow, candidates: string[]): string => {
  const normalizedCandidates = new Set(candidates.map(normalizeKey));

  for (const [key, rawValue] of Object.entries(row)) {
    if (normalizedCandidates.has(normalizeKey(key))) {
      return (rawValue ?? "").trim();
    }
  }

  return "";
};

const buildQuestionPayload = (rows: CsvRow[]): QuestionInsert[] => {
  return rows.map((row, index) => {
    const topicIdRaw = getField(row, ["topic_id", "topicid"]);
    const questionText = getField(row, ["question_text", "questiontext", "question"]);
    const optionA = getField(row, ["optionA", "option_a", "a"]);
    const optionB = getField(row, ["optionB", "option_b", "b"]);
    const optionC = getField(row, ["optionC", "option_c", "c"]);
    const optionD = getField(row, ["optionD", "option_d", "d"]);
    const correctAnswer = getField(row, [
      "correct_answer",
      "correctanswer",
      "answer",
    ]).toUpperCase();

    const topicId = Number.parseInt(topicIdRaw, 10);
    const rowNumber = index + 2;

    if (!Number.isInteger(topicId)) {
      throw new Error(`Invalid topic_id at CSV row ${rowNumber}`);
    }

    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      throw new Error(`Missing question data at CSV row ${rowNumber}`);
    }

    if (correctAnswer && !["A", "B", "C", "D"].includes(correctAnswer)) {
      throw new Error(`Invalid correct_answer at CSV row ${rowNumber}`);
    }

    return {
      topic_id: topicId,
      question_text: questionText,
      options: {
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD,
      },
      ...(correctAnswer ? { correct_answer: correctAnswer } : {}),
    };
  });
};

const validateAdminCredentials = (request: Request): boolean => {
  const inputUsername = request.headers.get("x-admin-username") ?? "";
  const inputPassword = request.headers.get("x-admin-password") ?? "";
  const envUsername = process.env.ADMIN_USERNAME ?? "";
  const envPassword = process.env.ADMIN_PASSWORD ?? "";

  return inputUsername === envUsername && inputPassword === envPassword;
};

export async function POST(request: Request) {
  if (!validateAdminCredentials(request)) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "validate" | "sync";
    };
    const action = body.action ?? "sync";

    if (action === "validate") {
      return Response.json({
        success: true,
        message: "Đăng nhập admin thành công.",
      });
    }

    const sheetId = getRequiredEnv("NEXT_PUBLIC_TOPIC_QUESTION_SHEET_ID");
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    const csvResponse = await fetch(csvUrl, { cache: "no-store" });
    if (!csvResponse.ok) {
      return Response.json(
        {
          success: false,
          message: `Không thể tải CSV từ Google Sheets (${csvResponse.status}).`,
        },
        { status: 502 },
      );
    }

    const csvText = await csvResponse.text();

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return Response.json(
        {
          success: false,
          message: "CSV không hợp lệ.",
          errors: parsed.errors.map((error) => error.message),
        },
        { status: 400 },
      );
    }

    const rows = parsed.data;
    if (!rows.length) {
      return Response.json(
        { success: false, message: "CSV không có dữ liệu câu hỏi." },
        { status: 400 },
      );
    }

    const questionPayload = buildQuestionPayload(rows);

    const { error: deleteError } = await supabaseAdmin
      .from("questions")
      .delete()
      .not("id", "is", null);

    if (deleteError) {
      return Response.json(
        { success: false, message: deleteError.message },
        { status: 500 },
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("questions")
      .insert(questionPayload);

    if (insertError) {
      return Response.json(
        { success: false, message: insertError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: `Đồng bộ thành công ${questionPayload.length} câu hỏi.`,
      count: questionPayload.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lỗi không xác định khi đồng bộ.";
    return Response.json({ success: false, message }, { status: 500 });
  }
}
