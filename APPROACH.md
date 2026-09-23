# Engineering Approach & Technical Architecture

*Documenting the design decisions, concurrency strategies, trade-offs, and implementation rationale for the Micro-Learning Progress Tracker.*

---

## Q1: Schema & Architecture Decisions

### 1. Database Schema & Table Normalization

I structured the relational database model in PostgreSQL using **5 dedicated tables** managed via Prisma ORM:

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│   Learner   │───1:N──│  Enrollment  │───N:1──│   Course    │
└─────────────┘        └──────────────┘        └─────────────┘
       │                                              │
      1:N                                            1:N
       │               ┌────────────────┐             │
       └───────────────│ LessonProgress │───N:1───────┘ (via Lesson)
                       └────────────────┘             │
                                                      │
                                               ┌─────────────┐
                                               │   Lesson    │
                                               └─────────────┘
```

#### Table Breakdown & Rationale:

1. **`Learner`**: Stores user identity metadata (`id`, `name`, `email`). Kept minimal since authentication was intentionally scoped to a mock selector for this take-home task.
2. **`Course`**: Stores top-level course metadata (`title`, `description`). Acts as the parent container for lessons and enrollments.
3. **`Lesson`**: Contains actual educational content (`title`, `content`), references its parent course via `courseId`, and includes an explicit ordering sequence (`orderIndex`).
4. **`Enrollment`**: Explicit junction table mapping learners to courses with timestamping (`enrolledAt`). Separating enrollment from progress allows us to distinguish between *"a student who registered for a course but hasn't started"* vs *"a student who completed 3 lessons"*.
5. **`LessonProgress`**: Junction table tracking completed lessons per learner (`learnerId`, `lessonId`, `completedAt`). Keeping completion state outside the `Lesson` table allows multiple learners to independently complete the exact same lessons without data contamination.

---

### 2. Why Composite Unique Constraints?

I enforced two key composite unique constraints in `schema.prisma`:

#### A. `Enrollment` (`@@unique([learnerId, courseId])`)
Prevents duplicate enrollment rows. If a user double-clicks the "Enroll" button or retries an HTTP request, PostgreSQL rejects the second insertion at the database level rather than creating orphaned duplicate enrollment records.

#### B. `LessonProgress` (`@@unique([learnerId, lessonId])`)
Guarantees that a learner can only have **exactly one progress record per lesson**. This constraint is the core architectural foundation for our race condition solution.

---

### 3. Explicit `orderIndex` vs. Database Insertion Order

A common beginner trap is relying on database primary key IDs (`id: 1, 2, 3...`) or table insertion order to render lessons in sequence. In SQL databases (including PostgreSQL):
- Table rows are stored as unordered collections (heap pages).
- Executing `SELECT * FROM "Lesson"` without an explicit `ORDER BY` clause produces **non-deterministic ordering**.
- Auto-incrementing IDs break if a lesson is deleted or inserted out of order during updates.

#### Solution:
I added an explicit `orderIndex` field on the `Lesson` model combined with a composite constraint:
```prisma
model Lesson {
  id         Int    @id @default(autoincrement())
  courseId   Int
  orderIndex Int
  // ...

  @@unique([courseId, orderIndex])
}
```

This guarantees:
1. Lessons are always queried with `orderBy: { orderIndex: 'asc' }`.
2. No two lessons in the same course can share the same sequence position.
3. Course content can be re-ordered in the future without modifying primary key relationships.

---

### 4. Codebase Architecture: Standard MVC Pattern

To keep the codebase maintainable, readable, and standard for senior engineer review, I implemented a strict Model-View-Controller (MVC) directory structure in `backend/src/`:

```
backend/src/
├── lib/
│   └── prisma.js         # Singleton Prisma client instance
├── middleware/
│   └── errorHandler.js   # Centralized Express error handler
├── routes/
│   ├── courseRoutes.js   # Route definitions & HTTP verb mapping
│   ├── lessonRoutes.js
│   ├── enrollRoutes.js
│   └── learnerRoutes.js
└── controllers/
    ├── courseController.js  # Business logic & query orchestration
    ├── lessonController.js
    ├── enrollController.js
    └── learnerController.js
```

#### Key Architecture Benefits:
- **Prisma Singleton (`lib/prisma.js`)**: Instantiates a single `PrismaClient` object across the app lifecycle. Prevents warning logs and connection pool exhaustion caused by re-instantiating clients across module imports.
- **Route / Controller Decoupling**: Routes strictly map HTTP verbs (`GET`, `POST`) to controller methods. Controllers handle input validation (`parseInt`, `isNaN` checks), Prisma queries, and HTTP response formatting.
- **Uniform API Response Contract**: Every endpoint returns a consistent JSON payload:
  - Success: `{ success: true, data: { ... } }`
  - Failure: `{ success: false, error: "Human readable message" }`
- **Centralized Error Middleware**: Any unexpected runtime exception is caught by a `try/catch` inside controllers and passed to `next(error)`, returning a clean 500 JSON response instead of crashing the Node process.

---

## Q2: Concurrency & Race Condition Solution

### The Concurrency Problem

Consider a scenario where a learner clicks **"Mark Complete"** on a lesson. Due to network latency, browser double-clicks, or multiple open tabs, two HTTP POST requests hit the backend simultaneously:

```
Request A (POST /api/lessons/3/complete) ──────┐
                                               ├─► Hit Backend Simultaneously
Request B (POST /api/lessons/3/complete) ──────┘
```

#### What happens in a naive implementation?

```js
// ❌ NAIVE APPROACH (Vulnerable to Race Condition)
const existing = await prisma.lessonProgress.findFirst({
  where: { learnerId, lessonId }
});

if (!existing) {
  // 💥 RACE CONDITION WINDOW HERE!
  await prisma.lessonProgress.create({
    data: { learnerId, lessonId }
  });
}
```

1. **Request A** queries `findFirst()` -> finds no record (`null`).
2. **Request B** queries `findFirst()` at the exact same millisecond -> also finds no record (`null`).
3. Both requests evaluate `if (!existing)` to `true`.
4. Both requests execute `create()`.
5. **Result**: Two duplicate rows are written to the database for the exact same lesson and learner, corrupting progress calculation logic.

---

### The Storage-Engine Solution: Database Unique Index + Prisma Upsert

Rather than using complex application-level mutex locks or Redis distributed locks (which add infrastructure complexity and latency), I solved this at the **PostgreSQL storage engine level**.

#### 1. The Database Constraint
In `schema.prisma`:
```prisma
model LessonProgress {
  id          Int      @id @default(autoincrement())
  learnerId   Int
  lessonId    Int
  completedAt DateTime @default(now())

  @@unique([learnerId, lessonId])
}
```

PostgreSQL automatically creates a composite B-tree unique index on `(learnerId, lessonId)`.

#### 2. The Atomic Controller Implementation
In `lessonController.js`:
```js
// upsert handles the race condition at db level
const progress = await prisma.lessonProgress.upsert({
  where: {
    learnerId_lessonId: {
      learnerId: learnerIdInt,
      lessonId: lessonIdInt
    }
  },
  create: {
    learnerId: learnerIdInt,
    lessonId: lessonIdInt
  },
  update: {} // No-op: if record exists, do nothing
});
```

---

### Low-Level Execution Sequence in PostgreSQL

When two simultaneous `upsert` queries arrive at PostgreSQL:

```
Thread A (Transaction 1)               Thread B (Transaction 2)
────────────────────────               ────────────────────────
BEGIN TRANSACTION                       BEGIN TRANSACTION
Acquire tuple lock on index             Attempt lock on same index tuple
Insert row -> SUCCESS                   BLOCKED (Waits for Tx 1)
COMMIT TRANSACTION                      Unblocked -> Unique constraint collision!
                                        Executes UPDATE clause (No-op)
                                        Returns existing row
                                        COMMIT TRANSACTION
```

1. PostgreSQL uses **Write-Ahead Logging (WAL)** and row-level locks on index checks.
2. Transaction 1 acquires the index lock and inserts the row.
3. Transaction 2 encounters the unique lock and waits.
4. Once Transaction 1 commits, Transaction 2 detects the existing key collision and executes the empty `update: {}` block.
5. Both HTTP requests return `200 OK` with valid data.
6. **Database state guarantees exactly 1 row exists.**

---

## Q3: Engineering Trade-offs & Production Considerations

During development, I intentionally made several pragmatic trade-offs to keep the codebase focused, clean, and fully aligned with the assignment evaluation rubric.

### 1. Mock Learner Selector vs. Full JWT Authentication

- **Trade-off**: Implemented a header dropdown selector backed by React Context and `localStorage` instead of building a complete authentication server (JWT, bcrypt password hashing, session cookies, refresh tokens).
- **Rationale**: The core evaluation rubric focuses on progress tracking, database schema normalization, and concurrency safety. Building full authentication would have added 200+ lines of user auth boilerplate without demonstrating additional domain-specific progress logic.
- **Production Path**: In production, `LearnerContext` would be replaced by an AuthProvider reading JWT bearer tokens from HTTP-only cookies, decoding `learnerId` directly from signed request headers (`req.user.id`).

---

### 2. Optimistic UI vs. Pessimistic Waiting

- **Trade-off**: In `CoursePage.jsx`, clicking "Mark Complete" instantly marks the lesson checkbox checked and updates the progress bar before the API network call resolves.
- **Rationale**: In micro-learning apps, snappy user feedback is essential. Users shouldn't stare at loading spinners for minor progress toggles.
- **Rollback Safety**: If the API call fails (e.g. server offline or network drop):
  ```js
  const previousLessons = [...lessons];
  // 1. Optimistic update
  setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, completed: true } : l));

  try {
    await api.post(`/api/lessons/${lessonId}/complete`, ...);
  } catch (err) {
    // 2. Rollback state if network call fails
    setLessons(previousLessons);
    setError("Failed to mark lesson complete. Please try again.");
  }
  ```

---

### 3. All-in-One Progress Query vs. Fine-Grained Aggregations

- **Trade-off**: The `GET /api/learners/:id/progress` endpoint fetches all enrolled courses and their associated lessons in a nested Prisma query, computing percentages in memory.
- **Rationale**: For micro-learning courses (e.g., 5–10 courses with 5–20 lessons each), computing percentages in Node.js memory is extremely fast (sub-millisecond) and simplifies frontend state consumption.
- **Production Path**: If scaling to thousands of courses and millions of completion records, I would introduce raw SQL aggregation queries (`COUNT`, `GROUP BY`) or maintain a denormalized `completed_count` cache column in PostgreSQL.

---

### 4. Production Enhancements I Would Add Next

1. **Redis Caching Layer**: Cache `GET /api/learners/:id/progress` response payloads in Redis, invalidating the cache key only when a `POST /api/lessons/:id/complete` event succeeds.
2. **WebSocket / SSE Syncing**: Emit progress updates via Socket.io so if a learner opens the app on mobile and desktop simultaneously, progress updates across both devices in real-time.
3. **Rate Limiting Middleware**: Attach `express-rate-limit` to `/api/lessons/:id/complete` to prevent malicious API spamming.

---

## Q4: AI Tool Transparency

During the initial design phase of this project, I used Claude as a technical sounding board to review edge-case handling around composite schema definitions.

### Specific Engineering Example: Catching Anti-Pattern vs. Atomic Upsert

When brainstorming duplicate completion handling, Claude initially suggested wrapping a standard Prisma `create()` call inside a JavaScript `try/catch` block and catching PostgreSQL error code `P2002` (Unique constraint violation):

```js
// ❌ AI-SUGGESTED PATTERN (Control flow via exception handling)
try {
  const progress = await prisma.lessonProgress.create({
    data: { learnerId: learnerIdInt, lessonId: lessonIdInt }
  });
  return res.json({ success: true, data: progress });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint failed — fetch existing record
    const existing = await prisma.lessonProgress.findUnique({ ... });
    return res.json({ success: true, data: existing });
  }
  throw error;
}
```

#### My Refactoring Rationale:

I immediately identified that **using exception handling for normal control flow is an architectural anti-pattern**:
1. In a multi-user application, completing an already-completed lesson is an expected idempotent operation, not an abnormal application crash.
2. Throwing and catching exceptions in V8 JavaScript creates stack trace objects, adding unnecessary CPU and memory overhead.
3. It requires two roundtrips to PostgreSQL on duplicate calls (one failed `INSERT`, followed by one `SELECT`).

I refactored the logic to use Prisma's native `upsert()` with an empty `update: {}` block:

```js
// ✅ REFACTORED PATTERN (Atomic idempotent operation)
const progress = await prisma.lessonProgress.upsert({
  where: {
    learnerId_lessonId: {
      learnerId: learnerIdInt,
      lessonId: lessonIdInt
    }
  },
  create: {
    learnerId: learnerIdInt,
    lessonId: lessonIdInt
  },
  update: {} // DB handles idempotency natively
});
```

This refactoring ensures clean control flow, zero exception overhead, single-roundtrip database execution, and a truly atomic solution to the race condition.
