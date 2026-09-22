import React, { useState } from 'react';
import { useLearner } from '../context/LearnerContext';
import { UserCheck, ChevronDown } from 'lucide-react';

export default function LearnerSelector() {
  const { learners, selectedLearner, selectLearner } = useLearner();
  const [isEditing, setIsEditing] = useState(false);

  const handleSelect = (e) => {
    const learnerId = parseInt(e.target.value, 10);
    const learner = learners.find((l) => l.id === learnerId);
    if (learner) {
      selectLearner(learner);
      setIsEditing(false);
    }
  };

  if (!learners.length) return null;

  return (
    <div className="flex items-center bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5 text-sm">
      <UserCheck className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" />
      <span className="text-gray-600 font-medium mr-1.5">Learning as:</span>

      {!isEditing && selectedLearner ? (
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-indigo-900">{selectedLearner.name}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium ml-1"
          >
            [Change]
          </button>
        </div>
      ) : (
        <div className="relative">
          <select
            value={selectedLearner ? selectedLearner.id : ''}
            onChange={handleSelect}
            onBlur={() => setIsEditing(false)}
            autoFocus={isEditing}
            className="appearance-none bg-white border border-indigo-200 text-gray-800 text-xs rounded-md pl-2 pr-7 py-1 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {learner.name} ({learner.email})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
      )}
    </div>
  );
}
