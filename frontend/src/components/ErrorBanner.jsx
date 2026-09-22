import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ErrorBanner({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm flex items-center justify-between transition-all duration-300">
      <div className="flex items-center space-x-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium text-red-700">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-red-400 hover:text-red-600 transition-colors p-1"
        aria-label="Dismiss error"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
