import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionAiAnalysis } from './QuestionAiAnalysis';
import type { Question } from '../types/questions';

const question: Question = {
  id: 42, certification: 'CTFL', type: 'single_choice', question: 'What is static testing?',
  options: { A: 'Review without execution', B: 'Execute the code' }, correct_answer: [],
  answer_text: '', community_vote: '', domain: 'Testing', mode: 'quiz',
};

describe('AI learner feedback', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('renders AI markdown as headings, emphasis, lists and separators instead of raw markers', async () => {
    const markdown = '# Feedback on Your Answer\n\nYou selected **C**, but review *test maintenance*.\n\n## Why B is Correct\n\nPrioritize limited resources.\n\n- **A**: first option\n- D: second option\n\n---\n\n1. Review the principle\n2. Try another question';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: markdown }) }));
    const { container } = render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['B'], correct: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    expect(await screen.findByRole('heading', { name: 'Feedback on Your Answer', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Why B is Correct', level: 4 })).toBeInTheDocument();
    expect(container.querySelector('em')).toHaveTextContent('test maintenance');
    expect(container.querySelector('strong')).toHaveTextContent('C');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.queryByText(/^##? /)).not.toBeInTheDocument();
  });

  it('does not execute HTML or render unsafe links from AI output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      text: '<script>alert(1)</script>\n\n[Review](javascript:alert%281%29)',
    }) }));
    const { container } = render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['B'], correct: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    await screen.findByText('Review');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a')).not.toHaveAttribute('href', 'javascript:alert%281%29');
  });

  it('sends the current learner response and server grade without learning history', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'Review static testing.' }) });
    vi.stubGlobal('fetch', fetch);
    render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['B'], correct: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    expect(await screen.findByText('Review static testing.')).toBeInTheDocument();
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    const context = JSON.parse(body.prompt.split('Learning data:\n')[1]);
    expect(context.learnerAnswer.selectedAnswers).toEqual(['B']);
    expect(context.gradingResult).toBe('incorrect');
    expect(context).not.toHaveProperty('recentAttemptsOnThisQuestion');
    expect(body.prompt).toContain('Do not include learning patterns');
    expect(context.subject).toBe('software testing');
    expect(fetch.mock.calls[0][0]).toBe('/api/ai/feedback');
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-api-key');
  });

  it('does not reuse feedback from a different answer on the same question', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Incorrect choice feedback' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Correct choice feedback' }) });
    vi.stubGlobal('fetch', fetch);
    const first = render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['B'], correct: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    await screen.findByText('Incorrect choice feedback');
    first.unmount();
    render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['A'], correct: true }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    expect(await screen.findByText('Correct choice feedback')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('allows retrying a failed API request without caching the error', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ message: 'Rate limit reached. Please retry.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ text: 'Recovered feedback' }) });
    vi.stubGlobal('fetch', fetch);
    render(<QuestionAiAnalysis question={question} correctAnswers={['A']}
      feedback={{ selectedAnswers: ['B'], correct: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'AI Analysis' }));
    await screen.findByText(/Rate limit reached/);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Recovered feedback')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
