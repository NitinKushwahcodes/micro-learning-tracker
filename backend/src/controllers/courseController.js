const prisma = require('../lib/prisma');

async function getCourses(req, res, next) {
  try {
    const courses = await prisma.course.findMany({
      include: {
        _count: {
          select: { lessons: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    next(error);
  }
}

async function getCourseById(req, res, next) {
  try {
    const courseId = parseInt(req.params.id, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const learnerId = req.query.learnerId ? parseInt(req.query.learnerId, 10) : null;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Course not found'
      });
    }

    let completedLessonIds = new Set();
    if (learnerId && !isNaN(learnerId)) {
      const completedRecords = await prisma.lessonProgress.findMany({
        where: {
          learnerId,
          lesson: { courseId }
        },
        select: { lessonId: true }
      });
      completedLessonIds = new Set(completedRecords.map((r) => r.lessonId));
    }

    const lessons = course.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      orderIndex: lesson.orderIndex,
      completed: completedLessonIds.has(lesson.id)
    }));

    res.json({
      success: true,
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        lessons
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCourses,
  getCourseById
};
