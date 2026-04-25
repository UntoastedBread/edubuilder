// Estimate lesson duration in minutes based on block types and content
const BLOCK_TIMES = {
  reading: 1.5,    // ~1.5 min per reading block (assumes ~120 words at 200wpm + thinking)
  quiz: 0.75,      // ~45s per quiz question
  'fill-blank': 0.5,
  'drag-order': 0.75,
  'short-answer': 1.5,
  video: 3,        // average video length
  sandbox: 2,      // coding takes longer
};

export function estimateDuration(blocks) {
  if (!blocks || blocks.length === 0) return 0;

  let totalMinutes = 0;
  for (const block of blocks) {
    const base = BLOCK_TIMES[block.type] || 1;

    // Adjust reading time based on actual word count if available
    if (block.type === 'reading' && block.data?.content) {
      const words = block.data.content.split(/\s+/).length;
      totalMinutes += Math.max(0.5, words / 150); // ~150 wpm with comprehension
    } else {
      totalMinutes += base;
    }
  }

  return Math.max(1, Math.round(totalMinutes));
}
