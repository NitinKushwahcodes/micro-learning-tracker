# Micro-Learning Progress Tracker

A full-stack EdTech web application for tracking learner progress through micro-courses, handling concurrent lesson completions atomically, and updating progress instantly with an optimistic user interface.

---

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running locally on port 5432 (or configured via environment variables)

---

## Setup & Running Locally

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Copy environment template and configure database URL
cp .env.example .env

# Run Prisma database migrations
npx prisma migrate dev --name init

# Seed the database with initial courses, lessons, and learners
npx prisma db seed

# Start the Express server (runs on port 4000)
node server.js
```

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

---

## API Endpoints

All API responses follow a uniform contract:
- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "error": "Error message description" }`

| Method | Route | Description | Request Body / Query | Response Data |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/learners` | Fetch all learners for dropdown selector | None | `[{ id, name, email }]` |
| `GET` | `/api/courses` | Fetch all available courses with lesson count | None | `[{ id, title, description, _count: { lessons } }]` |
| `GET` | `/api/courses/:id` | Fetch course details with ordered lessons and completion status | Query: `?learnerId=1` | `{ id, title, description, lessons: [{ id, title, content, orderIndex, completed }] }` |
| `POST` | `/api/enroll` | Enroll a learner into a course (prevents duplicates) | `{ learnerId: 1, courseId: 1 }` | 201: `{ id, learnerId, courseId, enrolledAt }`<br>409: `Already enrolled in this course` |
| `POST` | `/api/lessons/:id/complete` | Mark lesson complete atomically (race-condition safe) | `{ learnerId: 1 }` | 200: `{ lessonId, learnerId, completedAt, alreadyCompleted }`<br>403: `Enroll in this course first` |
| `GET` | `/api/learners/:id/progress` | Fetch overall progress breakdown across enrolled courses | None | `{ learner: { id, name, email }, courses: [{ courseId, title, totalLessons, completedLessons, percentage, lessons }] }` |

---

## Tech Stack & Why

- **Express.js (Node.js)**: Lightweight, modular HTTP web framework suitable for standard REST API architecture without excess boilerplate.
- **PostgreSQL**: Robust ACID-compliant relational database that enforces constraints (such as composite unique indices) at the storage engine level.
- **Prisma ORM**: Type-safe query builder providing clean relational schemas, declarative migrations, and atomic `upsert` operations.
- **React + Vite**: Fast, declarative UI library paired with Vite for lightning-quick build times and instant module replacement.
- **Tailwind CSS**: Utility-first CSS framework allowing consistent design systems and fast responsive UI styling without custom CSS overhead.

---

## Key Design Decisions

1. **Composite Unique Constraint for Race Conditions**: A database-level `@@unique([learnerId, lessonId])` composite index guarantees that no duplicate completion rows can ever be written, even under simultaneous high-frequency POST requests.
2. **Prisma Upsert as Atomic Operation**: Using `prisma.lessonProgress.upsert()` ensures that concurrent completion requests resolve atomically inside PostgreSQL rather than relying on application-level locks or try/catch blocks.
3. **Optimistic UI for Instant Feedback**: Clicking "Mark Complete" instantly updates local state and progress bar percentages, falling back with automatic state rollback if the backend network call fails.
4. **Mock Learner Selector vs JWT**: Avoided unnecessary authentication overhead (JWT/sessions) for this take-home scope while keeping global learner state persisted in `localStorage` across page reloads.
