export type QuestionInteractionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'yes_no'
  | 'unordered_selection'
  | 'fixed_match'
  | 'ordering'
  | 'dropdown'
  | 'yes_no_matrix'
  | 'image_self_grade'
  | 'image_hotspot';

export type InteractionPrompt = {
  text: string;
  options?: string[];
};

export type InteractionDefinition =
  | { kind: 'match'; pool: string[]; prompts: InteractionPrompt[] }
  | { kind: 'dropdown'; prompts: InteractionPrompt[]; layout?: 'url'; urlTemplate?: string }
  | { kind: 'yesno'; prompts: InteractionPrompt[] }
  | { kind: 'click'; label: string }
  | { kind: 'self_grade' };

export type InteractionResponse =
  | { answers: string[] }
  | { x: number; y: number };

export type InteractionSolution =
  | { answers: string[] }
  | { region: { x: number; y: number; w: number; h: number } };

export type InteractiveSubmission =
  | { interactionResponse: InteractionResponse }
  | { selfGrade: boolean };
