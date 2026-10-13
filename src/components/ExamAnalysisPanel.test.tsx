import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ExamAnalysisPanel } from './ExamAnalysisPanel';

const mocks = vi.hoisted(() => ({ get: vi.fn(), generate: vi.fn() }));
vi.mock('../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'learner' } }) }));
vi.mock('../services/api', () => ({ getExamAnalysis: mocks.get, generateExamSummary: mocks.generate }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockImplementation(async (attemptId: string) => ({ attemptId, score: 1, total: 2, modules: [
    { id: 1, name: 'Testing', total: 2, correct: 1, accuracy: attemptId === 'first' ? 50 : 0, smallSample: true },
    { id: 2, name: 'Tools', total: 0, correct: 0, accuracy: null, smallSample: false },
  ] }));
  mocks.generate.mockResolvedValue({ text: '**Review testing.**', generatedAt: '2026-10-13T00:00:00Z' });
});

it('loads only the selected exam and generates its summary on demand', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<ExamAnalysisPanel attemptId="first" />);
  await screen.findByLabelText('Testing: 50% correct, 1 of 2 questions, small sample');
  expect(screen.getByLabelText('Tools: not included in this exam')).toBeInTheDocument();
  expect(mocks.generate).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Generate summary' }));
  await screen.findByText('Review testing.');
  expect(mocks.generate).toHaveBeenCalledWith('first');
  await user.click(screen.getByRole('button', { name: 'Hide' }));
  await user.click(screen.getByRole('button', { name: 'Show' }));
  expect(mocks.generate).toHaveBeenCalledTimes(1);
  rerender(<ExamAnalysisPanel attemptId="second" />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('second'));
  await screen.findByRole('button', { name: 'Generate summary' });
  expect(screen.queryByText('Review testing.')).not.toBeInTheDocument();
});
