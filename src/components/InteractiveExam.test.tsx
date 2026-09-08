import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InteractiveExam } from './InteractiveExam';

describe('InteractiveExam', () => {
  it('submits an unordered selection without revealing the expected count', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{
          kind: 'match',
          pool: ['Alpha', 'Beta', 'Gamma'],
          prompts: [
            { text: 'Answer' },
            { text: 'Answer' },
          ],
        }}
        interactionType="unordered_selection"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText(/select 2/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { answers: ['Alpha'] } });
  });

  it('supports click placement for a fixed match question', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{
          kind: 'match',
          pool: ['Alpha', 'Beta'],
          prompts: [
            { text: 'First' },
            { text: 'Second' },
          ],
        }}
        interactionType="fixed_match"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    await user.click(screen.getAllByRole('button', { name: 'Alpha' })[1]);
    await user.click(screen.getByRole('button', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Beta' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { answers: ['Alpha', 'Beta'] } });
  });

  it('requires every yes/no matrix row before submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{ kind: 'yesno', prompts: [{ text: 'First' }, { text: 'Second' }] }}
        interactionType="yes_no_matrix"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
    await user.click(screen.getAllByRole('radio')[0]);
    expect(submit).toBeDisabled();
    await user.click(screen.getAllByRole('radio')[3]);
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { answers: ['Yes', 'No'] } });
  });

  it('allows keyboard selection for an image hotspot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{ kind: 'click', label: 'Target area' }}
        interactionType="image_hotspot"
        imageUrl="/question.png"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    const hotspot = screen.getByRole('button', { name: /select a point for: target area/i });
    hotspot.focus();
    await user.keyboard('{ArrowRight}{Enter}');

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { x: 0.52, y: 0.5 } });
  });

  it('submits a mouse position for an image hotspot', () => {
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{ kind: 'click', label: 'Target area' }}
        interactionType="image_hotspot"
        imageUrl="/question.png"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
        hideSubmit
      />,
    );

    const hotspot = screen.getByRole('button', { name: /select a point for: target area/i });
    vi.spyOn(hotspot, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      toJSON: () => ({}),
    });
    fireEvent.click(hotspot, { clientX: 110, clientY: 70 });

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { x: 0.5, y: 0.5 } });
  });

  it('collects dropdown answers in prompt order', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{
          kind: 'dropdown',
          prompts: [
            { text: 'Choose the first value', options: ['Alpha', 'Beta'] },
            { text: 'choose the second value', options: ['One', 'Two'] },
          ],
        }}
        interactionType="dropdown"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    const dropdowns = screen.getAllByRole('combobox');
    await user.selectOptions(dropdowns[0], 'Beta');
    await user.selectOptions(dropdowns[1], 'Two');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { answers: ['Beta', 'Two'] } });
  });

  it('renders and submits an inline URL dropdown question', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <InteractiveExam
        data={{
          kind: 'dropdown',
          layout: 'url',
          urlTemplate: 'https://{0}/{1}',
          prompts: [
            { text: 'Host', options: ['one.example', 'two.example'] },
            { text: 'Path', options: ['first', 'second'] },
          ],
        }}
        interactionType="dropdown"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    const dropdowns = screen.getAllByRole('combobox');
    await user.selectOptions(dropdowns[0], 'one.example');
    await user.selectOptions(dropdowns[1], 'second');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('https://')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith({ interactionResponse: { answers: ['one.example', 'second'] } });
  });

  it('supports the self-grade reveal workflow', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <InteractiveExam
        data={{ kind: 'self_grade' }}
        interactionType="image_self_grade"
        checked={false}
        showAnswer={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/Self-grade question/)).toBeVisible();
    rerender(
      <InteractiveExam
        data={{ kind: 'self_grade' }}
        interactionType="image_self_grade"
        checked={false}
        showAnswer
        onSubmit={onSubmit}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'I got it right' }));

    expect(onSubmit).toHaveBeenCalledWith({ selfGrade: true });
  });

  it('shows the server solution after an incorrect fixed match submission', () => {
    render(
      <InteractiveExam
        data={{
          kind: 'match',
          pool: ['Alpha', 'Beta'],
          prompts: [{ text: 'First' }, { text: 'Second' }],
        }}
        interactionType="fixed_match"
        checked
        showAnswer
        solution={{ answers: ['Alpha', 'Beta'] }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText(/"First" should be/)).toHaveTextContent('Alpha');
    expect(screen.getByText(/"Second" should be/)).toHaveTextContent('Beta');
  });
});
