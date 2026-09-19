import { formatTextList } from './format-text-list';

describe('formatTextList', () => {
  it('formats title, numbered options, and an optional footer deterministically', () => {
    expect(formatTextList('Lunch', ['Pizza', 'Salad'], 'Kitchen closes at 3')).toBe(
      '*Lunch*\n\n1. Pizza\n2. Salad\n\nKitchen closes at 3',
    );
  });

  it('omits the footer block when footer is absent or blank', () => {
    expect(formatTextList('Pick', ['A', 'B'])).toBe('*Pick*\n\n1. A\n2. B');
    expect(formatTextList('Pick', ['A', 'B'], '   ')).toBe('*Pick*\n\n1. A\n2. B');
  });
});
