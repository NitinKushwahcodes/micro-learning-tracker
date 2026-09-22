const prisma = require('../lib/prisma');

async function enrollLearner(req, res, next) {
  try {
    const { learnerId, courseId } = req.body;

    const learnerIdInt = parseInt(learnerId, 10);
    const courseIdInt = parseInt(courseId, 10);

    if (isNaN(learnerIdInt) || isNaN(courseIdInt)) {
      return res.status(400).json({
        success: false,
        error: 'learnerId and courseId must be valid integers'
      });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        learnerId_courseId: {
          learnerId: learnerIdInt,
          courseId: courseIdInt
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Already enrolled in this course'
      });
    }

    const learner = await prisma.learner.findUnique({ where: { id: learnerIdInt } });
    if (!learner) {
      return res.status(404).json({ success: false, error: 'Learner not found' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseIdInt } });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        learnerId: learnerIdInt,
        courseId: courseIdInt
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: enrollment.id,
        learnerId: enrollment.learnerId,
        courseId: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  enrollLearner
};
