"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Send } from "lucide-react";
import { getSystemDate } from "@/utils/dateUtils";
import ConfirmModal from "@/components/ConfirmModal";

type CandidateData = {
  full_name: string;
  cccd: string;
  phone: string;
  location: string;
  unit: string;
  specialty: string;
  quiz_start_time?: string;
};

type QuizQuestion = {
  id: string;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
};

type QuestionsResponse = {
  success: boolean;
  message?: string;
  topicId?: number;
  topicTitle?: string;
  questions?: QuizQuestion[];
};

type SubmitResponse = {
  success: boolean;
  message: string;
  submissionId?: string;
  score?: number;
  totalQuestions?: number;
};

const QUIZ_DURATION_SECONDS = 15 * 60;
const QUIZ_START_TIME_KEY = "quiz_start_time";
const QUIZ_START_TOPIC_KEY = "quiz_start_topic_id";
const QUIZ_USER_CCCD_KEY = "quiz_user_cccd";
const getQuizAnswersKey = (topicId: number) => `quiz_answers_${topicId}`;
const getQuizQuestionOrderKey = (topicId: number) =>
  `quiz_question_order_${topicId}`;
const QUIZ_CANDIDATE_KEY = "quiz_candidate";

const clearQuizPersistence = () => {
  const storedTopicId = localStorage.getItem(QUIZ_START_TOPIC_KEY);
  if (storedTopicId) {
    const parsedTopicId = Number.parseInt(storedTopicId, 10);
    if (Number.isFinite(parsedTopicId)) {
      localStorage.removeItem(getQuizAnswersKey(parsedTopicId));
      localStorage.removeItem(getQuizQuestionOrderKey(parsedTopicId));
    }
  }

  localStorage.removeItem(QUIZ_START_TIME_KEY);
  localStorage.removeItem(QUIZ_START_TOPIC_KEY);
  localStorage.removeItem(QUIZ_USER_CCCD_KEY);
};

const clearQuizLocalStorageAfterSubmit = () => {
  const keysToDelete: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith("quiz_")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(QUIZ_CANDIDATE_KEY);
};

const shuffle = <T,>(list: T[]): T[] => {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const formatTime = (seconds: number): string => {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function QuizPage() {
  const router = useRouter();
  const submitLockedRef = useRef(false);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(QUIZ_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isTimerReady, setIsTimerReady] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [predictionCount, setPredictionCount] = useState("");
  const [quizStartTimeIso, setQuizStartTimeIso] = useState<string | null>(null);

  useEffect(() => {
    const rawCandidate = localStorage.getItem(QUIZ_CANDIDATE_KEY);
    if (!rawCandidate) {
      router.replace("/");
      return;
    }

    try {
      const parsedCandidate = JSON.parse(rawCandidate) as CandidateData;
      if (!parsedCandidate?.cccd) {
        router.replace("/");
        return;
      }
      setCandidate(parsedCandidate);
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!candidate) return;
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/quiz/questions", { cache: "no-store" });
        const payload = (await response.json()) as QuestionsResponse;
        if (!response.ok || !payload.success) {
          setMessage(payload.message || "Không thể tải đề thi.");
          return;
        }

        const nextTopicId = payload.topicId ?? null;
        const fetchedQuestions = payload.questions ?? [];
        const currentCccd = candidate.cccd.trim();

        if (!nextTopicId) {
          setTopicId(null);
          setTopicTitle(payload.topicTitle ?? "");
          setQuestions([]);
          return;
        }

        const orderKey = getQuizQuestionOrderKey(nextTopicId);
        const storedQuizUserCccd = localStorage
          .getItem(QUIZ_USER_CCCD_KEY)
          ?.trim();
        const rawStoredOrder = localStorage.getItem(orderKey);

        let arrangedQuestions = fetchedQuestions;
        let hasValidStoredOrder = false;

        if (storedQuizUserCccd === currentCccd && rawStoredOrder) {
          try {
            const parsedOrder = JSON.parse(rawStoredOrder) as string[];
            if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
              const questionById = new Map(
                fetchedQuestions.map((question) => [question.id, question]),
              );

              const orderedFromStorage = parsedOrder
                .map((questionId) => questionById.get(questionId))
                .filter((question): question is QuizQuestion => Boolean(question));

              if (orderedFromStorage.length > 0) {
                const usedIds = new Set(orderedFromStorage.map((q) => q.id));
                const remainingQuestions = fetchedQuestions.filter(
                  (question) => !usedIds.has(question.id),
                );
                arrangedQuestions = [...orderedFromStorage, ...remainingQuestions];
                hasValidStoredOrder = true;
              }
            }
          } catch {
            localStorage.removeItem(orderKey);
          }
        }

        if (!hasValidStoredOrder) {
          arrangedQuestions = shuffle(fetchedQuestions);
          localStorage.setItem(
            orderKey,
            JSON.stringify(arrangedQuestions.map((question) => question.id)),
          );
          localStorage.setItem(QUIZ_USER_CCCD_KEY, currentCccd);
        }

        setTopicId(nextTopicId);
        setTopicTitle(payload.topicTitle ?? "");
        setQuestions(arrangedQuestions);
      } catch {
        setMessage("Không thể tải đề thi.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [candidate]);

  useEffect(() => {
    if (isLoading || !questions.length || !topicId) {
      return;
    }

    const currentCandidateCccd = candidate?.cccd?.trim();
    if (!currentCandidateCccd) {
      router.replace("/");
      return;
    }

    const storedQuizUserCccd = localStorage.getItem(QUIZ_USER_CCCD_KEY)?.trim();
    if (storedQuizUserCccd && storedQuizUserCccd !== currentCandidateCccd) {
      clearQuizPersistence();
      setUserAnswers({});
      setSecondsLeft(QUIZ_DURATION_SECONDS);
    }

    localStorage.setItem(QUIZ_USER_CCCD_KEY, currentCandidateCccd);

    const storedTopicId = localStorage.getItem(QUIZ_START_TOPIC_KEY);
    if (storedTopicId && storedTopicId !== String(topicId)) {
      localStorage.removeItem(QUIZ_START_TIME_KEY);
      localStorage.removeItem(QUIZ_START_TOPIC_KEY);
      const previousTopicId = Number.parseInt(storedTopicId, 10);
      if (Number.isFinite(previousTopicId)) {
        localStorage.removeItem(getQuizAnswersKey(previousTopicId));
        localStorage.removeItem(getQuizQuestionOrderKey(previousTopicId));
      }
    }

    const nowMs = getSystemDate().getTime();
    const storedStartTime = localStorage.getItem(QUIZ_START_TIME_KEY);
    let startMs = Number.NaN;

    if (storedStartTime) {
      const parsedStartMs = Number.parseInt(storedStartTime, 10);
      if (Number.isFinite(parsedStartMs) && parsedStartMs > 0) {
        startMs = parsedStartMs;
      }
    }

    if (!Number.isFinite(startMs)) {
      const candidateStartMs = candidate?.quiz_start_time
        ? new Date(candidate.quiz_start_time).getTime()
        : Number.NaN;
      startMs =
        Number.isFinite(candidateStartMs) && candidateStartMs > 0
          ? candidateStartMs
          : nowMs;
      localStorage.setItem(QUIZ_START_TIME_KEY, String(startMs));
    }
    localStorage.setItem(QUIZ_START_TOPIC_KEY, String(topicId));
    setQuizStartTimeIso(new Date(startMs).toISOString());

    const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
    const remaining = Math.max(QUIZ_DURATION_SECONDS - elapsedSeconds, 0);
    setSecondsLeft(remaining);
    setIsTimerReady(true);
  }, [candidate?.cccd, candidate?.quiz_start_time, isLoading, questions.length, router, topicId]);

  useEffect(() => {
    if (isLoading || !questions.length || !topicId) {
      return;
    }

    const answersKey = getQuizAnswersKey(topicId);
    const rawSavedAnswers = localStorage.getItem(answersKey);
    if (!rawSavedAnswers) {
      setUserAnswers({});
      return;
    }

    try {
      const parsedAnswers = JSON.parse(rawSavedAnswers) as Record<string, string>;
      const validQuestionIds = new Set(questions.map((question) => question.id));
      const sanitizedAnswers = Object.fromEntries(
        Object.entries(parsedAnswers).filter(
          ([questionId, selected]) =>
            validQuestionIds.has(questionId) && ["A", "B", "C", "D"].includes(selected),
        ),
      );
      setUserAnswers(sanitizedAnswers);
    } catch {
      setUserAnswers({});
      localStorage.removeItem(answersKey);
    }
  }, [isLoading, questions, topicId]);

  useEffect(() => {
    if (!topicId) return;
    localStorage.setItem(getQuizAnswersKey(topicId), JSON.stringify(userAnswers));
  }, [topicId, userAnswers]);

  useEffect(() => {
    if (isLoading || isSubmitting || isFinished || !questions.length || !isTimerReady)
      return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, isSubmitting, isFinished, questions.length, isTimerReady]);

  const submitQuiz = async () => {
    if (submitLockedRef.current || !candidate || !topicId) return;

    const normalizedPredictionCount = Number.parseInt(predictionCount, 10);
    if (!Number.isFinite(normalizedPredictionCount) || normalizedPredictionCount < 0) {
      setMessage("Vui lòng nhập số dự đoán hợp lệ trước khi hoàn thành.");
      return;
    }

    submitLockedRef.current = true;
    setIsSubmitting(true);

    const normalizedAnswers = Object.entries(userAnswers).map(
      ([question_id, selected]) => ({
        question_id,
        selected: selected as "A" | "B" | "C" | "D",
      }),
    );

    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...candidate,
          topic_id: topicId,
          userAnswers: normalizedAnswers,
          prediction_count: normalizedPredictionCount,
          quiz_start_time: quizStartTimeIso,
        }),
      });

      const payload = (await response.json()) as SubmitResponse;
      if (!response.ok || !payload.success) {
        setMessage(payload.message || "Không thể nộp bài.");
        submitLockedRef.current = false;
        setIsSubmitting(false);
        return;
      }

      clearQuizLocalStorageAfterSubmit();
      const query = new URLSearchParams({
        submissionId: payload.submissionId ?? "",
        score: String(payload.score ?? 0),
        totalQuestions: String(payload.totalQuestions ?? 0),
        autoSubmitted: "0",
      });
      router.push(`/prediction?${query.toString()}`);
    } catch {
      setMessage("Lỗi kết nối khi nộp bài.");
      submitLockedRef.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isLoading || isSubmitting || !isTimerReady || secondsLeft > 0) return;
    setIsFinished(true);
  }, [secondsLeft, isLoading, isSubmitting, isTimerReady]);

  const answeredCount = useMemo(
    () => Object.values(userAnswers).filter(Boolean).length,
    [userAnswers],
  );
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const progress =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isLowTime = secondsLeft <= 120;

  const handleFinishQuiz = () => {
    if (!questions.length) return;

    if (unansweredCount > 0) {
      setShowConfirmModal(true);
      return;
    }

    setIsFinished(true);
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900">Bài thi trắc nghiệm</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Chủ đề: <span className="font-medium text-zinc-800">{topicTitle || "-"}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              isLowTime ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            <Clock3 className="h-4 w-4" />
            {formatTime(secondsLeft)}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-600">
              <span>
                Đã làm {answeredCount}/{questions.length} câu
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-600">Đang tải câu hỏi...</p>
      ) : !isFinished ? (
        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <div
              key={question.id}
              id={`question-${question.id}`}
              className={`rounded-xl border bg-white p-5 shadow-sm transition ${
                userAnswers[question.id]
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-zinc-200"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-zinc-900">
                  Câu {index + 1}. {question.question_text}
                </p>
                {userAnswers[question.id] ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Đã trả lời
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Chưa trả lời
                  </span>
                )}
              </div>

              <div className="mt-3 grid gap-2">
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const optionText = question.options?.[key] ?? "";
                  const isSelected = userAnswers[question.id] === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setUserAnswers((prev) => ({ ...prev, [question.id]: key }))
                      }
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      <span className="mt-0.5 font-semibold">{key}.</span>
                      <span className="flex-1">{optionText}</span>
                      {isSelected ? <CheckCircle2 className="h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleFinishQuiz}
            disabled={isSubmitting || !questions.length}
            className="mb-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Nộp bài
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Bạn đã hoàn thành phần thi trắc nghiệm!
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Theo bạn, có bao nhiêu người tham gia cuộc thi này?
          </p>

          <div className="mt-4">
            <input
              type="number"
              min={0}
              value={predictionCount}
              onChange={(event) => setPredictionCount(event.target.value)}
              placeholder="Nhập số dự đoán"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
            />
          </div>

          <button
            type="button"
            onClick={() => void submitQuiz()}
            disabled={isSubmitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Đang gửi kết quả..." : "Hoàn thành và Gửi kết quả"}
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        unansweredCount={unansweredCount}
        onContinue={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          setIsFinished(true);
        }}
      />
    </main>
  );
}
