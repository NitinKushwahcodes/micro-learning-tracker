import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const LearnerContext = createContext(null);

export function LearnerProvider({ children }) {
  const [learners, setLearners] = useState([]);
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLearners = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/learners');
      if (res.data.success) {
        const list = res.data.data;
        setLearners(list);

        const savedId = localStorage.getItem('selectedLearnerId');
        if (savedId && list.length > 0) {
          const match = list.find((l) => l.id === parseInt(savedId, 10));
          if (match) {
            setSelectedLearner(match);
          } else {
            setSelectedLearner(list[0]);
            localStorage.setItem('selectedLearnerId', list[0].id);
          }
        } else if (list.length > 0) {
          setSelectedLearner(list[0]);
          localStorage.setItem('selectedLearnerId', list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load learners:', err);
      setError('Failed to fetch learners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearners();
  }, []);

  const selectLearner = (learner) => {
    setSelectedLearner(learner);
    if (learner && learner.id) {
      localStorage.setItem('selectedLearnerId', learner.id);
    } else {
      localStorage.removeItem('selectedLearnerId');
    }
  };

  return (
    <LearnerContext.Provider
      value={{
        learners,
        selectedLearner,
        selectLearner,
        loading,
        error,
        refreshLearners: fetchLearners
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
}

export function useLearner() {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error('useLearner must be used within a LearnerProvider');
  }
  return context;
}
