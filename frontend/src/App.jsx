import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { LearnerProvider } from './context/LearnerContext';
import LearnerSelector from './components/LearnerSelector';
import CoursesPage from './pages/CoursesPage';
import CoursePage from './pages/CoursePage';
import { GraduationCap } from 'lucide-react';

export default function App() {
  return (
    <LearnerProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link to="/courses" className="flex items-center space-x-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="font-bold text-lg text-gray-900 tracking-tight">
                  Root2Rise <span className="text-indigo-600 font-normal">Tracker</span>
                </span>
              </Link>

              <LearnerSelector />
            </div>
          </header>

          <main className="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/courses" replace />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CoursePage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </LearnerProvider>
  );
}
