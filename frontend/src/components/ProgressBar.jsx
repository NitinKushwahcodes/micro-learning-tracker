import React from 'react';

export default function ProgressBar({ completedCount = 0, totalCount = 0 }) {
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">Course Progress</span>
        <span className="text-sm font-medium text-indigo-600">
          {completedCount} of {totalCount} lessons completed ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden">
        <div
          className="bg-indigo-600 h-3.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
