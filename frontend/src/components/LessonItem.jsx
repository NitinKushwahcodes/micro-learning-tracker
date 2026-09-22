import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function LessonItem({ lesson, onComplete, isCompleting }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden shadow-sm hover:border-gray-300 transition-colors">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {lesson.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs text-gray-400 font-semibold">
                {lesson.orderIndex}
              </div>
            )}
          </div>
          <div>
            <h3
              className={`text-sm font-semibold ${
                lesson.completed ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}
            >
              {lesson.orderIndex}. {lesson.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!lesson.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isCompleting) onComplete(lesson.id);
              }}
              disabled={isCompleting}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                'Mark Complete'
              )}
            </button>
          )}

          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
          <p className="whitespace-pre-line leading-relaxed">{lesson.content}</p>
        </div>
      )}
    </div>
  );
}
