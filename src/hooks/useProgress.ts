import { useState, useEffect, useCallback } from 'react';

export interface QuestionResult {
  correct: boolean;
  selectedAnswer: string[];
  attemptedAt: number;
}

export interface ProgressState {
  results: Record<number, QuestionResult[]>; // questionId -> attempts
  examHistory: ExamAttempt[];
}

export interface ExamAttempt {
  id: string;
  date: number;
  score: number;
  total: number;
  durationSec: number;
  domainScores: Record<string, { correct: number; total: number }>;
  // Per-question record for review (added later — older attempts may lack these)
  questionIds?: number[];
  answers?: Record<number, string[] | 'correct' | 'incorrect'>;
  // Which cert this attempt belongs to (added when multi-cert was introduced)
  certification?: 'AZ-900' | 'CLF-C02';
}

const STORAGE_KEY = 'az900_progress';

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { results: {}, examHistory: [] };
}

function save(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(load);

  useEffect(() => {
    save(state);
  }, [state]);

  const recordAnswer = useCallback((questionId: number, correct: boolean, selectedAnswer: string[]) => {
    setState(prev => {
      const existing = prev.results[questionId] ?? [];
      return {
        ...prev,
        results: {
          ...prev.results,
          [questionId]: [...existing, { correct, selectedAnswer, attemptedAt: Date.now() }],
        },
      };
    });
  }, []);

  const recordExam = useCallback((attempt: ExamAttempt) => {
    setState(prev => ({
      ...prev,
      examHistory: [attempt, ...prev.examHistory].slice(0, 20),
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState({ results: {}, examHistory: [] });
  }, []);

  const getQuestionStats = useCallback((questionId: number) => {
    const attempts = state.results[questionId] ?? [];
    const lastAttempt = attempts[attempts.length - 1];
    const correctCount = attempts.filter(a => a.correct).length;
    return { attempts: attempts.length, correctCount, lastAttempt };
  }, [state.results]);

  const getOverallStats = useCallback(() => {
    const allAttempts = Object.values(state.results).flat();
    const attempted = Object.keys(state.results).length;
    const correct = allAttempts.filter(a => a.correct).length;
    return { attempted, correct, total: allAttempts.length };
  }, [state.results]);

  return { state, recordAnswer, recordExam, resetProgress, getQuestionStats, getOverallStats };
}
