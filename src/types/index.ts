export interface Topic {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
}

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: string;
  topic_id: number;
  question_text: string;
  options: QuestionOptions;
  correct_answer: "A" | "B" | "C" | "D";
  created_at: string;
}

export interface UserAnswer {
  question_id: string;
  selected: "A" | "B" | "C" | "D";
}

export interface Submission {
  id: string;
  cccd: string;
  full_name: string;
  phone: string;
  location: string;
  unit: string;
  specialty: "Quân đội" | "Công An" | "Khác";
  topic_id: number;
  score: number;
  total_questions: number;
  user_answers: UserAnswer[];
  prediction_count: number;
  quiz_start_time: string;
  duration: number;
  created_at: string;
}
