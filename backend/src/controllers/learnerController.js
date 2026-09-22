const prisma = require('../lib/prisma');

async function getLearners(req, res, next) {
  try {
    const learners = await prisma.learner.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      data: learners
    });
  } catch (error) {
    next(error);
  }
}

async function getLearnerProgress(req, res, next) {
  try {
    const learnerId = parseInt(req.params.id, 10);
    if (isNaN(learnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid learner ID'
      });
    }

    const learner = await prisma.learner.findUnique({
      where: { id: learnerId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                lessons: {
                  orderBy: { orderIndex: 'asc' }
                }
              }
            }
          }
        },
        progress: true
      }
    });

    if (!learner) {
      return res.status(404).json({
        success: false,
        error: 'Learner not found'
      });
    }

    const progressMap = new Map(
      learner.progress.map((p) => [p.lessonId, p.completedAt])
    );

    const coursesProgress = learner.enrollments.map((enrollment) => {
      const course = enrollment.course;
      const totalLessons = course.lessons.length;

      const lessons = course.lessons.map((lesson) => {
        const completedAt = progressMap.get(lesson.id) || null;
        return {
          lessonId: lesson.id,
          title: lesson.title,
          completed: Boolean(completedAt),
          completedAt
        };
      });

      const completedLessons = lessons.filter((l) => l.completed).length;
      const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        courseId: course.id,
        title: course.title,
        totalLessons,
        completedLessons,
        percentage,
        lessons
      };
    });

    res.json({
      success: true,
      data: {
        learner: {
          id: learner.id,
          name: learner.name,
          email: learner.email
        },
        courses: coursesProgress
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLearners,
  getLearnerProgress
};
