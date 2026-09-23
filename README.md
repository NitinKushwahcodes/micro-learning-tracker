# 🎓 Micro-Learning Progress Tracker

> **Full-Stack EdTech Take-Home Assignment | Root2Rise Internship**  
> A production-ready, full-stack micro-learning progress tracking platform built with **Node.js, Express, Prisma ORM, PostgreSQL, React, Vite, and Tailwind CSS**.

---

## 🔗 Live Deployment Links

| Service | Live URL | Status |
| :--- | :--- | :--- |
| 💻 **Frontend Demo App** | [https://micro-learning-tracker-nine.vercel.app](https://micro-learning-tracker-nine.vercel.app) | `Active (Vercel)` |
| 🚀 **Backend API** | [https://micro-learning-tracker-s2le.onrender.com](https://micro-learning-tracker-s2le.onrender.com) | `Active (Render)` |
| 📡 **API Learners Endpoint** | [https://micro-learning-tracker-s2le.onrender.com/api/learners](https://micro-learning-tracker-s2le.onrender.com/api/learners) | `Active` |
| 📚 **API Courses Endpoint** | [https://micro-learning-tracker-s2le.onrender.com/api/courses](https://micro-learning-tracker-s2le.onrender.com/api/courses) | `Active` |

> ℹ️ *Note for Reviewers*: The backend is hosted on Render free tier. If the initial API request takes a few seconds, the server instance is waking up from idle state.

---

## ✨ Key Features & Highlights

- **🔒 Database-Level Concurrency & Race Condition Fix**: Uses PostgreSQL composite unique constraint `@@unique([learnerId, lessonId])` paired with Prisma's atomic `upsert` operation. Prevents duplicate completion records during rapid or simultaneous requests without application-level lock overhead.
- **⚡ Instant Optimistic UI**: Marking a lesson complete updates local React state and progress bar calculations immediately. If the backend API call fails, state automatically rolls back and displays a timed error banner.
- **👤 Persisted Learner Context**: Switch between learners using the header dropdown. Selected learner state persists across page reloads via `localStorage`.
- **📊 Dynamic Course Progress**: Calculates completed lesson percentages and total lesson counts per enrolled course in real-time.
- **🛡️ Clean MVC Architecture & Clean Code**: Strict separation of concerns (Routes, Controllers, Services/Prisma Client, Error Middleware) following standard Node.js/Express REST design patterns.

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express**: RESTful API server architecture
- **Prisma ORM (v5)**: Schema definition, database migrations, and type-safe query builder
- **PostgreSQL**: Relational database storing Learners, Courses, Lessons, Enrollments, and Progress
- **Cors & Dotenv**: Cross-origin resource sharing and environment management

### Frontend
- **React (v18)**: Component-driven user interface with React Router v6
- **Vite**: Ultra-fast build tool and local development server
- **Tailwind CSS**: Utility-first styling for responsive design
- **Axios**: HTTP client for API communication
- **Lucide React**: Modern UI icons

---

## 📂 Project Structure

```
micro-learning-tracker/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database models & composite constraints
│   │   └── seed.js              # Idempotent database seed script
│   ├── src/
│   │   ├── controllers/         # Request handling & response formatting
│   │   │   ├── courseController.js
│   │   │   ├── enrollController.js
│   │   │   ├── learnerController.js
│   │   │   └── lessonController.js
│   │   ├── lib/
│   │   │   └── prisma.js        # Prisma client singleton instance
│   │   ├── middleware/
│   │   │   └── errorHandler.js  # Global Express error handling middleware
│   │   └── routes/              # Express API route declarations
│   │       ├── courseRoutes.js
│   │       ├── enrollRoutes.js
│   │       ├── learnerRoutes.js
│   │       └── lessonRoutes.js
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Express dependencies & scripts
│   └── server.js                # Express app entrypoint & health check
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js         # Axios HTTP client configuration
│   │   ├── components/          # Reusable UI components
│   │   │   ├── CourseCard.jsx
│   │   │   ├── ErrorBanner.jsx
│   │   │   ├── LearnerSelector.jsx
│   │   │   ├── LessonItem.jsx
│   │   │   └── ProgressBar.jsx
│   │   ├── context/
│   │   │   └── LearnerContext.jsx # Global learner state + localStorage
│   │   ├── pages/
│   │   │   ├── CoursePage.jsx   # Course detail & optimistic lesson view
│   │   │   └── CoursesPage.jsx  # Course grid & enrollment page
│   │   ├── App.jsx              # Main routing & layout
│   │   └── main.jsx             # React DOM entrypoint
│   ├── .env.example             # Frontend environment template
│   ├── package.json             # React dependencies
│   └── vite.config.js           # Vite configuration
│
├── README.md                    # Project documentation
└── APPROACH.md                  # Detailed architectural & technical decisions
```

---

## 🗄️ Database Schema (Prisma)

```prisma
model Learner {
  id          Int              @id @default(autoincrement())
  name        String
  email       String           @unique
  createdAt   DateTime         @default(now())
  enrollments Enrollment[]
  progress    LessonProgress[]
}

model Course {
  id          Int          @id @default(autoincrement())
  title       String
  description String
  lessons     Lesson[]
  enrollments Enrollment[]
}

model Lesson {
  id          Int              @id @default(autoincrement())
  courseId    Int
  title       String
  content     String
  orderIndex  Int
  course      Course           @relation(fields: [courseId], references: [id])
  progress    LessonProgress[]

  @@unique([courseId, orderIndex])  // Enforces unique lesson ordering per course
}

model Enrollment {
  id         Int      @id @default(autoincrement())
  learnerId  Int
  courseId   Int
  enrolledAt DateTime @default(now())
  learner    Learner  @relation(fields: [learnerId], references: [id])
  course     Course   @relation(fields: [courseId], references: [id])

  @@unique([learnerId, courseId])   // Prevents duplicate enrollments
}

model LessonProgress {
  id          Int      @id @default(autoincrement())
  learnerId   Int
  lessonId    Int
  completedAt DateTime @default(now())
  learner     Learner  @relation(fields: [learnerId], references: [id])
  lesson      Lesson   @relation(fields: [lessonId], references: [id])

  @@unique([learnerId, lessonId])   // Core race condition fix
}
```

---

## 🚀 Local Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running locally on port 5432

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file from template
cp .env.example .env
```

Edit `backend/.env` with your local PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/microlearning"
PORT=4000
```

Run database migration & seeding:
```bash
# Create database schema
npx prisma migrate dev --name init

# Seed initial courses, lessons, and learners
npx prisma db seed

# Start Express server
node server.js
```
The backend server will start on **`http://localhost:4000`**.

### 2. Frontend Setup

In a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Ensure `frontend/.env` contains:
```env
VITE_API_URL=http://localhost:4000
```

Start Vite dev server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 📡 Complete API Reference

All API responses follow a uniform JSON structure:
- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "error": "Error description" }`

### 1. Health Check
- **`GET /`**
  - **Response**: `{ "success": true, "message": "Micro-Learning Progress Tracker API is running" }`

### 2. Learners
- **`GET /api/learners`**
  - **Description**: Returns all learners for the header profile selector.
  - **Response (200)**:
    ```json
    {
      "success": true,
      "data": [
        { "id": 1, "name": "Arjun Mehta", "email": "arjun@example.com" },
        { "id": 2, "name": "Priya Sharma", "email": "priya@example.com" }
      ]
    }
    ```

- **`GET /api/learners/:id/progress`**
  - **Description**: Returns total progress and completed lessons across all enrolled courses for a learner.
  - **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "learner": { "id": 1, "name": "Arjun Mehta", "email": "arjun@example.com" },
        "courses": [
          {
            "courseId": 1,
            "title": "JavaScript Fundamentals",
            "totalLessons": 4,
            "completedLessons": 2,
            "percentage": 50,
            "lessons": [
              { "lessonId": 1, "title": "Variables and Data Types", "completed": true, "completedAt": "2026-09-22T19:23:35.000Z" }
            ]
          }
        ]
      }
    }
    ```

### 3. Courses
- **`GET /api/courses`**
  - **Description**: List all courses with total lesson count.
  - **Response (200)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "title": "JavaScript Fundamentals",
          "description": "Core JS concepts from basics to async",
          "_count": { "lessons": 4 }
        }
      ]
    }
    ```

- **`GET /api/courses/:id?learnerId=1`**
  - **Description**: Fetch single course with ordered lessons and current learner's completion status.
  - **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "title": "JavaScript Fundamentals",
        "description": "Core JS concepts from basics to async",
        "lessons": [
          {
            "id": 1,
            "title": "Variables and Data Types",
            "content": "Understand var, let, const...",
            "orderIndex": 1,
            "completed": true
          }
        ]
      }
    }
    ```

### 4. Enrollments
- **`POST /api/enroll`**
  - **Description**: Enroll a learner in a course.
  - **Request Body**: `{ "learnerId": 1, "courseId": 2 }`
  - **Response (201)**: `{ "success": true, "data": { "id": 2, "learnerId": 1, "courseId": 2, "enrolledAt": "..." } }`
  - **Response (409)**: `{ "success": false, "error": "Already enrolled in this course" }`

### 5. Lesson Completion (Atomic & Race Condition Safe)
- **`POST /api/lessons/:id/complete`**
  - **Description**: Mark a lesson complete for a learner using Prisma `upsert`.
  - **Request Body**: `{ "learnerId": 1 }`
  - **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "lessonId": 3,
        "learnerId": 1,
        "completedAt": "2026-09-22T22:00:00.000Z",
        "alreadyCompleted": false
      }
    }
    ```
  - **Response (403)**: `{ "success": false, "error": "Enroll in this course first" }`

---

## ⚡ Concurrency & Architectural Highlights

Read **[APPROACH.md](APPROACH.md)** for full deep-dive architectural documentation, including:
- Why composite unique constraints (`@@unique([learnerId, lessonId])`) outperform application-level locks.
- Storage engine Write-Ahead Logging (WAL) and row lock behavior during simultaneous HTTP POST calls.
- Optimistic UI state management with automatic rollback on network failure.
- AI transparency details regarding Prisma `upsert` vs try-catch anti-patterns.