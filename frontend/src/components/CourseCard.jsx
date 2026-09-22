import React from 'react';
import { BookOpen, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';

export default function CourseCard({ course, isEnrolled, onEnroll, isEnrolling, onNavigate }) {
  const lessonCount = course._count?.lessons || course.lessons?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-lg font-bold text-gray-900">{course.title}</h2>
          {isEnrolled && (
            <span className="inline-flex items-center text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
              <CheckCircle className="w-3 h-3 mr-1" />
              Enrolled
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {course.description}
        </p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-2">
        <div className="flex items-center text-xs text-gray-500 font-medium">
          <BookOpen className="w-4 h-4 mr-1 text-gray-400" />
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
        </div>

        {isEnrolled ? (
          <button
            onClick={() => onNavigate(course.id)}
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={() => onEnroll(course.id)}
            disabled={isEnrolling}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isEnrolling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Enrolling...
              </>
            ) : (
              'Enroll'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
