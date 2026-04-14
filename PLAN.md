# Project Plan: Online Quiz System (LLVT Capital Tradition)

## 1. Overview
A serverless online quiz platform built with **Next.js (App Router)**, **Supabase (PostgreSQL)**, and **Tailwind CSS**, deployed on **Vercel**.
- **CMS:** Google Sheets (Public CSV Export).
- **Database:** Supabase for high-performance queries and secure result storage.
- **Admin:** Protected dashboard for Data Sync and Excel Export.

## 2. Technical Stack
- **Frontend/Backend:** Next.js 14+ (App Router).
- **Database:** Supabase.
- **Styling:** Tailwind CSS + Shadcn/UI.
- **Data Export:** `xlsx` library for Excel generation.
- **Deployment:** Vercel.

## 3. Database Schema (Supabase)

### Table: `topics`
- `id`: Integer (Primary Key)
- `title`: Text
- `description`: Text
- `start_date`: Timestamp
- `end_date`: Timestamp

### Table: `questions`
- `id`: UUID (Primary Key)
- `topic_id`: Integer (Foreign Key -> topics.id)
- `question_text`: Text
- `options`: JSONB (Format: `{"A": "...", "B": "...", "C": "...", "D": "..."}`)
- `correct_answer`: Text (A, B, C, or D)
- `created_at`: Timestamp

### Table: `submissions`
- `id`: UUID (Primary Key)
- `cccd`: Text
- `full_name`: Text
- `phone`: Text
- `location`: Text
- `unit`: Text
- `specialty`: Text (Quân đội, Công An, Khác)
- `topic_id`: Integer (Foreign Key -> topics.id)
- `score`: Integer
- `total_questions`: Integer
- `user_answers`: JSONB (Format: `[{"question_id": "...", "selected": "..."}]`)
- `prediction_count`: Integer
- `created_at`: Timestamp
- **Constraint**: `UNIQUE(cccd, topic_id)` (Each person only tests once per topic).

## 4. Business Logic

### A. Time-Based Topics
System automatically selects the topic based on current server time:
1. **01/04 - 07/04:** Chủ đề 1 - Quyết tử để tổ quốc quyết sinh.
2. **08/04 - 15/04:** Chủ đề 2 - Hà Nội - Điện Biên Phủ trên không.
3. **16/04 - 20/04:** Chủ đề 3 - Xây dựng lực lượng, quyết chiến, quyết thắng.
4. **21/04 - 30/04:** Chủ đề 4 - Viết tiếp chiến công.

### B. User Flow (3-Step Wizard)
- **Step 1 (Onboarding):** Collect info. Check `submissions` for existing `cccd` + `topic_id`. If exists, block and alert.
- **Step 2 (Quiz):**
    - Fetch questions from Supabase (Filtering by `topic_id`).
    - Shuffle question order.
    - 15-minute countdown.
    - Submit to `/api/quiz/submit` (Server-side scoring).
- **Step 3 (Prediction):** Collect total participant prediction and finalize entry.

## 5. Implementation Modules

### Module 1: Admin Dashboard (`/admin`)
- **Manual Sync:** Button to fetch CSV from Google Sheets:
  `https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv`
  - Logic: Parse CSV -> Clear `questions` -> Insert new data.
- **Export Excel:** Query `submissions` joined with `topics` -> Download as `.xlsx`.
- **Security:** Access restricted via `ADMIN_PASSWORD` environment variable.

### Module 2: Secure Scoring API (`/api/quiz/submit`)
- **Input:** Participant info + Selected answers.
- **Logic:**
    1. Re-verify the current time vs topic availability.
    2. Fetch `correct_answer` from DB for the specific `topic_id`.
    3. Compare, calculate `score`.
    4. Save everything to `submissions` table.
- **Output:** Success/Failure status.

## 6. Security & Optimization
- **No Cheat:** `correct_answer` is never sent to the client-side quiz form.
- **Performance:** Use `cache: 'no-store'` for submission checks; use `revalidate` for topic fetching.
- **Privacy:** Data validation for CCCD on both Client and Server.

## 7. Configuration (Environment Variables)
- `DATABASE_PASSWORD`
- `DATABASE_API_URL`
- `DATABASE_PUBLISHABLE_KEY`
- `DATABASE_SECRET_KEY`
- `NEXT_PUBLIC_TOPIC_QUESTION_SHEET_ID`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `BANNER_IMAGE_URL`
