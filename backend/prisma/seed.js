const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const arjun = await prisma.learner.upsert({
    where: { email: 'arjun@example.com' },
    update: {},
    create: {
      name: 'Arjun Mehta',
      email: 'arjun@example.com'
    }
  });

  const priya = await prisma.learner.upsert({
    where: { email: 'priya@example.com' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'priya@example.com'
    }
  });

  let jsCourse = await prisma.course.findFirst({
    where: { title: 'JavaScript Fundamentals' }
  });
  if (!jsCourse) {
    jsCourse = await prisma.course.create({
      data: {
        title: 'JavaScript Fundamentals',
        description: 'Core JS concepts from basics to async'
      }
    });
  }

  let reactCourse = await prisma.course.findFirst({
    where: { title: 'React for Beginners' }
  });
  if (!reactCourse) {
    reactCourse = await prisma.course.create({
      data: {
        title: 'React for Beginners',
        description: 'Build UIs with React hooks and components'
      }
    });
  }

  const jsLessonsData = [
    { orderIndex: 1, title: 'Variables and Data Types', content: 'Understand var, let, const, primitive data types, and reference types in JavaScript.' },
    { orderIndex: 2, title: 'Functions and Scope', content: 'Explore function declarations, arrow functions, lexical scope, and closure concepts.' },
    { orderIndex: 3, title: 'Promises and Async/Await', content: 'Master asynchronous programming using Promises, async functions, and await expression.' },
    { orderIndex: 4, title: 'ES6+ Features', content: 'Learn modern syntax including destructuring, spread/rest operators, modules, and template literals.' }
  ];

  const jsLessons = [];
  for (const lesson of jsLessonsData) {
    const l = await prisma.lesson.upsert({
      where: {
        courseId_orderIndex: {
          courseId: jsCourse.id,
          orderIndex: lesson.orderIndex
        }
      },
      update: {
        title: lesson.title,
        content: lesson.content
      },
      create: {
        courseId: jsCourse.id,
        orderIndex: lesson.orderIndex,
        title: lesson.title,
        content: lesson.content
      }
    });
    jsLessons.push(l);
  }

  const reactLessonsData = [
    { orderIndex: 1, title: 'JSX and Components', content: 'Introduction to JSX syntax, functional components, and rendering elements.' },
    { orderIndex: 2, title: 'useState and useEffect', content: 'Manage component local state with useState and side effects with useEffect.' },
    { orderIndex: 3, title: 'Props and Component Communication', content: 'Pass data down with props, lift state up, and handle callbacks between components.' },
    { orderIndex: 4, title: 'Building a Mini Project', content: 'Combine components, state management, and API calls into a working micro-app.' }
  ];

  for (const lesson of reactLessonsData) {
    await prisma.lesson.upsert({
      where: {
        courseId_orderIndex: {
          courseId: reactCourse.id,
          orderIndex: lesson.orderIndex
        }
      },
      update: {
        title: lesson.title,
        content: lesson.content
      },
      create: {
        courseId: reactCourse.id,
        orderIndex: lesson.orderIndex,
        title: lesson.title,
        content: lesson.content
      }
    });
  }

  await prisma.enrollment.upsert({
    where: {
      learnerId_courseId: {
        learnerId: arjun.id,
        courseId: jsCourse.id
      }
    },
    update: {},
    create: {
      learnerId: arjun.id,
      courseId: jsCourse.id
    }
  });

  if (jsLessons.length >= 2) {
    await prisma.lessonProgress.upsert({
      where: {
        learnerId_lessonId: {
          learnerId: arjun.id,
          lessonId: jsLessons[0].id
        }
      },
      update: {},
      create: {
        learnerId: arjun.id,
        lessonId: jsLessons[0].id
      }
    });

    await prisma.lessonProgress.upsert({
      where: {
        learnerId_lessonId: {
          learnerId: arjun.id,
          lessonId: jsLessons[1].id
        }
      },
      update: {},
      create: {
        learnerId: arjun.id,
        lessonId: jsLessons[1].id
      }
    });
  }

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
