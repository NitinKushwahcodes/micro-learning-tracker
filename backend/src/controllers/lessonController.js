const prisma = require('../lib/prisma');

async function completeLesson(req, res, next) {
  try {
    const { learnerId } = req.body;
    const lessonIdInt = parseInt(req.params.id, 10);
    const learnerIdInt = parseInt(learnerId, 10);

    if (isNaN(lessonIdInt)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lesson ID'
      });
    }

    if (isNaN(learnerIdInt)) {
      return res.status(400).json({
        success: false,
        error: 'learnerId is required and must be an integer'
      });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonIdInt },
      select: { id: true, courseId: true }
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        learnerId_courseId: {
          learnerId: learnerIdInt,
          courseId: lesson.courseId
        }
      }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'Enroll in this course first'
      });
    }

    const existingBefore = await prisma.lessonProgress.findUnique({
      where: {
        learnerId_lessonId: {
          learnerId: learnerIdInt,
          lessonId: lessonIdInt
        }
      }
    });

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
      update: {}
    });

    res.json({
      success: true,
      data: {
        lessonId: progress.lessonId,
        learnerId: progress.learnerId,
        completedAt: progress.completedAt,
        alreadyCompleted: Boolean(existingBefore)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  completeLesson
};
