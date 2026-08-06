// Interactive question data (drag-drop, dropdown, yes/no matrix, hotspot).
//
// The full production dataset ships with hundreds of interactive entries.
// This sample file exposes the same type contract with one hand-written
// yes/no example so the renderer and exam engine still work end-to-end.

export type InteractivePrompt = {
  text: string;
  options?: string[];
  correct: string;
};

export type InteractiveData =
  | { kind: 'match'; pool: string[]; prompts: InteractivePrompt[] }
  | { kind: 'dropdown'; prompts: InteractivePrompt[]; layout?: 'url'; urlTemplate?: string }
  | { kind: 'yesno'; prompts: InteractivePrompt[] }
  | { kind: 'click'; label: string; correct: { x: number; y: number; w: number; h: number } }
  | { kind: 'self_grade' };

export const INTERACTIVE_DATA: Record<number, InteractiveData> = {
  // Sample yes/no matrix tied to question id=4 above.
  4: {
    kind: 'yesno',
    prompts: [
      { text: 'A resource group can contain resources from multiple Azure regions.', correct: 'Yes' },
      { text: 'Deleting a resource group also deletes the resources it contains.', correct: 'Yes' },
      { text: 'A resource can belong to more than one resource group at a time.', correct: 'No' },
    ],
  },
};
