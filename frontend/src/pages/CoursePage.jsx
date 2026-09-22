import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useLearner } from '../context/LearnerContext';
import ProgressBar from '../components/ProgressBar';
import LessonItem from '../components/LessonItem';
import ErrorBanner from '../components/ErrorBanner';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CoursePage() {
  const { id } = useParams();
  const { selectedLearner } = useLearner();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingLessonId, setCompletingLessonId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourseDetails();
  }, [id, selectedLearner]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = selectedLearner
        ? `/api/courses/${id}?learnerId=${selectedLearner.id}`
        : `/api/courses/${id}`;

      const res = await api.get(url);
      if (res.data.success) {
        setCourse({
          id: res.data.data.id,
          title: res.data.data.title,
          description: res.data.data.description
        });
        setLessons(res.data.data.lessons || []);
      }
    } catch (err) {
      console.error('Failed to load course:', err);
      const msg = err.response?.data?.error || 'Failed to load course details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async (lessonId) => {
    if (!selectedLearner) {
      setError('Please select a learner first');
      return;
    }

    const previousLessons = [...lessons];

    // Optimistic UI update: mark completed in local state immediately
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed: true } : lesson
      )
    );

    try {
      setCompletingLessonId(lessonId);
      setError(null);

      const res = await api.post(`/api/lessons/${lessonId}/complete`, {
        learnerId: selectedLearner.id
      });

      if (!res.data.success) {
        // Rollback state if API reports non-success
        setLessons(previousLessons);
        setError(res.data.error || 'Failed to complete lesson');
      }
    } catch (err) {
      // Rollback optimistic update on error
      setLessons(previousLessons);
      const msg = err.response?.data?.error || 'Failed to complete lesson. Please try again.';
      setError(msg);
    } finally {
      setCompletingLessonId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading course lessons...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div>
        <ErrorBanner message={error || 'Course not found'} onClose={() => setError(null)} />
        <Link to="/courses" className="inline-flex items-center text-sm text-indigo-600 font-medium">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to courses
        </Link>
      </div>
    );
  }

  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/courses"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to courses
      </Link>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
        <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
      </div>

      <ProgressBar completedCount={completedCount} totalCount={lessons.length} />

      <div className="space-y-1">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Lessons</h2>
        {lessons.map((lesson) => (
          <LessonItem
            key={lesson.id}
            lesson={lesson}
            onComplete={handleCompleteLesson}
            isCompleting={completingLessonId === lesson.id}
          />
        ))}
      </div>
    </div>
  );
}
