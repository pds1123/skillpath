// Question image manifest.
//
// In the full app, each entry maps a question ID to optional question-image
// and answer-image URLs. The image assets themselves are NOT included in
// this repository; this file exists so the code type-checks and runs.

export const QUESTION_IMAGES: Record<number, { question_img?: string; answer_img?: string; answer_inline_img?: string }> = {};
