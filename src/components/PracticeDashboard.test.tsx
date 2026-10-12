import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { PracticeDashboard } from './PracticeDashboard';
import type { PracticeDashboardData } from '../services/api';

vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
const data: PracticeDashboardData = {
  certification: 'CTFL', practiced: 3, firstCorrect: 1, latestCorrect: 2, toReview: 1,
  firstAccuracy: 33, latestAccuracy: 67, lastAttemptAt: 1000,
  modules: [
    { id: 1, slug: 'testing', name: 'Testing Fundamentals', practiced: 3, correct: 2, accuracy: 67, smallSample: true },
    { id: 2, slug: 'tools', name: 'Test Tools', practiced: 0, correct: 0, accuracy: null, smallSample: false },
  ],
};
const progress = { results: {}, examHistory: [], completedLessons: {}, knowledgeCheckPositions: {} };
afterEach(() => vi.unstubAllGlobals());

describe('Practice dashboard', () => {
  it('distinguishes unpracticed modules from zero accuracy and opens module practice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    const navigate = vi.fn();
    render(<PracticeDashboard activeCert="CTFL" progress={progress} onNavigate={navigate} />);
    const module = await screen.findByRole('button', { name: /Testing Fundamentals: 67%/ });
    expect(screen.getByText(/small sample/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Test Tools: not practiced/ })).toBeInTheDocument();
    fireEvent.click(module);
    expect(navigate).toHaveBeenCalledWith('modules', { module: 'testing', tab: 'practice' });
  });

  it('calls summary only on demand and can hide and reopen it without another AI call', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => data })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Focus on testing techniques.', generatedAt: '2026-10-12T00:00:00Z' }) });
    vi.stubGlobal('fetch', fetch);
    render(<PracticeDashboard activeCert="CTFL" progress={progress} onNavigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Generate summary' });
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Generate summary' }));
    expect(await screen.findByText('Focus on testing techniques.')).toBeVisible();
    expect(fetch.mock.calls[1][0]).toBe('/api/ai/summary');
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ certification: 'CTFL' });
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.getByText('Focus on testing techniques.')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByText('Focus on testing techniques.')).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
