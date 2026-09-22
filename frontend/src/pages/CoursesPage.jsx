import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useLearner } from '../context/LearnerContext';
import CourseCard from '../components/CourseCard';
import ErrorBanner from '../components/ErrorBanner';
import { Loader2, BookOpen } from 'lucide-react';

export default function CoursesPage() {
  const { selectedLearner } = useLearner();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCoursesAndProgress();
  }, [selectedLearner]);

  const fetchCoursesAndProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      const coursesRes = await api.get('/api/courses');
      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
      }

      if (selectedLearner) {
        const progressRes = await api.get(`/api/learners/${selectedLearner.id}/progress`);
        if (progressRes.data.success) {
          const ids = new Set(progressRes.data.data.courses.map((c) => c.courseId));
          setEnrolledCourseIds(ids);
        }
      } else {
        setEnrolledCourseIds(new Set());
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
      setError('Failed to fetch courses. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    if (!selectedLearner) {
      setError('Please select a learner first');
      return;
    }

    try {
      setEnrollingId(courseId);
      setError(null);

      const res = await api.post('/api/enroll', {
        learnerId: selectedLearner.id,
        courseId
      });

      if (res.data.success) {
        setEnrolledCourseIds((prev) => new Set([...prev, courseId]));
        navigate(`/courses/${courseId}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to enroll in course';
      setError(msg);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading courses...</p>
      </div>
    );
  }

  return (
    <div>
      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Explore Courses</h1>
        <p className="text-sm text-gray-600">
          Select a course to start learning and track your progress.
        </p>
      </div>

      {!selectedLearner && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
          Select a learner from the top header to enroll in courses and record progress.
        </div>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700">No courses available</h3>
          <p className="text-sm text-gray-500">Check back later for newly published courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isEnrolled={enrolledCourseIds.has(course.id)}
              isEnrolling={enrollingId === course.id}
              onEnroll={handleEnroll}
              onNavigate={(id) => navigate(`/courses/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
