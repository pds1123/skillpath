import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { getServerProgress, saveServerProgress } from '../services/api';

export interface QuestionResult {
  correct: boolean;
  selectedAnswer: string[];
  attemptedAt: number;
}

export interface ProgressState {
  results: Record<number, QuestionResult[]>; // questionId -> attempts
  examHistory: ExamAttempt[];
  completedLessons: Record<string, number>; // lesson key -> completion timestamp
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
  correctAnswers?: Record<number, string[]>;
  // Which cert this attempt belongs to (added when multi-cert was introduced)
  certification?: 'AZ-900' | 'CLF-C02';
}

const STORAGE_KEY = 'az900_progress';

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      return {
        results: parsed.results ?? {},
        examHistory: parsed.examHistory ?? [],
        completedLessons: parsed.completedLessons ?? {},
      };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return { results: {}, examHistory: [], completedLessons: {} };
}

function save(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useProgress() {
  const [state, setState] = useState<ProgressState>(load);
  const syncedUserId = useRef<string | null>(null);
  const stateRef = useRef(state);
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    syncedUserId.current = null;
    if (!userId) return () => { active = false; };

    getServerProgress<ProgressState>()
      .then(async serverProgress => {
        if (!active) return;
        if (serverProgress) {
          syncedUserId.current = userId;
          setState({
            results: serverProgress.results ?? {},
            examHistory: serverProgress.examHistory ?? [],
            completedLessons: serverProgress.completedLessons ?? {},
          });
        } else {
          await saveServerProgress(stateRef.current);
          syncedUserId.current = userId;
        }
      })
      .catch(() => {
        if (active) syncedUserId.current = null;
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    save(state);
    if (!userId || syncedUserId.current !== userId) return;
    const timeout = window.setTimeout(() => {
      void saveServerProgress(state);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [state, userId]);

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
    setState({ results: {}, examHistory: [], completedLessons: {} });
  }, []);

  const toggleLesson = useCallback((lessonKey: string) => {
    setState(prev => {
      const completedLessons = { ...prev.completedLessons };
      if (completedLessons[lessonKey]) delete completedLessons[lessonKey];
      else completedLessons[lessonKey] = Date.now();
      return { ...prev, completedLessons };
    });
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

  return { state, recordAnswer, recordExam, resetProgress, toggleLesson, getQuestionStats, getOverallStats };
}
