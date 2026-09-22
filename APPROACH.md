# Engineering Approach & Technical Architecture

## Q1: Schema & Architecture Decisions

### Database Schema Design
The application model consists of 5 core entities in PostgreSQL managed via Prisma:

1. **`Learner`**: Stores student identity metadata (`id`, `name`, `email`).
2. **`Course`**: Represents modular learning modules (`id`, `title`, `description`).
3. **`Lesson`**: Contains actual module content, course foreign key (`courseId`), and explicit sequence ordering (`orderIndex`).
4. **`Enrollment`**: Join entity mapping learners to courses with timestamping (`enrolledAt`).
5. **`LessonProgress`**: Tracks completed lessons per learner (`learnerId`, `lessonId`, `completedAt`).

### Why Composite Unique Constraints?
- **`Enrollment` (`@@unique([learnerId, courseId])`)**: Prevents duplicate enrollment rows if a user double-clicks an enroll button or re-issues enrollment requests.
- **`LessonProgress` (`@@unique([learnerId, lessonId])`)**: Enforces database-level uniqueness on lesson completions. This constraint is the core foundation for race condition prevention.

### Explicit `orderIndex` vs Database Insertion Order
Relying on database insertion order or auto-incrementing IDs for lesson sequences is fragile because database queries do not guarantee return ordering without an explicit `ORDER BY` clause. Defining an explicit `orderIndex` column with `@@unique([courseId, orderIndex])` ensures:
- Lessons are strictly presented in sequence regardless of when rows were created or seeded.
- Course creators can re-order lessons without altering primary keys or re-creating records.

### Separation of Concerns (MVC Pattern)
The backend uses standard Model-View-Controller layering:
- **`lib/prisma.js`**: Reusable database connection singleton avoiding client leakage across hot reloads.
- **`routes/`**: Express Router endpoints mapping HTTP verbs to controllers.
- **`controllers/`**: Pure request/response handling, input parsing, status code assignments, and business logic invocation.
- **`middleware/errorHandler.js`**: Centralized exception handler ensuring standard `{ success: false, error }` formats.

---

## Q2: Concurrency & Race Condition Solution

### The Race Condition Scenario
Consider a learner clicking "Mark Complete" on a lesson while using multiple browser tabs, or sending two rapid HTTP `POST /api/lessons/:id/complete` requests due to network lag. 

Without database constraints, an application checking existence beforehand using a traditional pattern:
```js
// ❌ Race condition vulnerability
const existing = await prisma.lessonProgress.findFirst({ where: { learnerId, lessonId } });
if (!existing) {
  await prisma.lessonProgress.create({ data: { learnerId, lessonId } });
}
```
If two requests arrive simultaneously, both `findFirst()` checks execute concurrently before either record is created. Both queries evaluate to `null`, causing both requests to proceed to `create()`, producing duplicate records and corrupted progress metrics.

### Storage-Engine Level Solution
We resolve this at the PostgreSQL storage layer using a composite unique index paired with Prisma's atomic `upsert`:

```prisma
// schema.prisma
model LessonProgress {
  id          Int      @id @default(autoincrement())
  learnerId   Int
  lessonId    Int
  completedAt DateTime @default(now())

  @@unique([learnerId, lessonId])
}
```

```js
// controllers/lessonController.js
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
  update: {} // upsert handles the race condition at db level
});
```

### How PostgreSQL Guarantees Atomicity
PostgreSQL uses Write-Ahead Logging (WAL) and row-level locks on unique index checks. When two transactions attempt to insert the same `(learnerId, lessonId)` tuple:
1. Transaction A acquires the lock on the index page and inserts the row.
2. Transaction B attempts insertion, hits the unique constraint lock, and waits for Transaction A to commit.
3. Upon Transaction A's commit, Prisma's `upsert` in Transaction B detects the existing row and safely executes the no-op `update: {}` block.
4. Exactly one row exists in the database. Both requests return `200 OK` with consistent data without application-level distributed locks.

---

## Q3: Trade-offs & Production Considerations

### 1. Mock Learner Selection vs. Full Authentication (JWT / OAuth)
- **Trade-off**: Used a client-side dropdown selector stored in React Context and `localStorage` instead of building a full JWT authentication server with bcrypt password hashing and session tokens.
- **Rationale**: The assignment rubric explicitly specified a mock learner selector. Skipping authentication saved roughly 2 hours of boilerplate without impacting core evaluation metrics.

### 2. No Pagination on `GET /api/courses`
- **Trade-off**: Returned all courses and lesson metrics in a single payload.
- **Rationale**: For small micro-learning catalogs, returning full data in a single request minimizes roundtrips. In production with thousands of courses, cursor-based pagination (`take`, `skip`) would be implemented.

### 3. Optimistic UI vs. Pessimistic Server Waiting
- **Trade-off**: Updated local lesson completion state immediately in the browser before waiting for HTTP response confirmation.
- **Rationale**: Micro-learning interactions demand instant response times. If the network call fails, state is rolled back and an error banner is displayed.

### Production Enhancements To Add
- **Redis Caching**: Cache computed progress percentages (`GET /api/learners/:id/progress`) with key invalidation on lesson completion.
- **WebSocket / Server-Sent Events**: Push real-time progress updates across multiple open tabs or devices.
- **Rate Limiting**: Add Express `express-rate-limit` middleware to prevent endpoint abuse.

---

## Q4: AI Tool Transparency

I leveraged Claude during the initial architectural design phase to brainstorm edge cases around composite key naming in Prisma schemas.

### Specific Architectural Correction
Claude initially suggested handling the duplicate completion race condition by wrapping a standard Prisma `create()` call in a `try-catch` block and catching PostgreSQL error code `P2002` (Unique constraint violation):

```js
// AI-suggested anti-pattern
try {
  await prisma.lessonProgress.create({ data: { learnerId, lessonId } });
} catch (error) {
  if (error.code === 'P2002') {
    // Return existing record...
  }
}
```

I recognized that using exception handling for normal execution flow is a code anti-pattern. Exception handling adds stack trace overhead and treats expected concurrent calls as errors. I refactored this to use `prisma.lessonProgress.upsert()` with an empty `update: {}` payload. `upsert` is the semantically correct, atomic database operation for "create if not exists", providing clean control flow without throwing unnecessary runtime exceptions.
