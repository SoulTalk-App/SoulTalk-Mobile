export type Mood = 'Normal' | 'Happy' | 'Mad' | 'Sad';

export interface JournalEntry {
  id: string;
  date: string;
  mood: Mood;
  content: string;
  year: number;
  month: number;
}

export const MOOD_COLORS: Record<Mood, string> = {
  Normal: '#59168B',
  Happy: '#EFDE11',
  Mad: '#F20F0F',
  Sad: '#0F3BF2',
};

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const YEARS = [2025, 2024, 2023];

export const journalEntries: JournalEntry[] = [
  {
    id: '1',
    date: '01/01',
    mood: 'Normal',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua....',
    year: 2025,
    month: 0,
  },
  {
    id: '2',
    date: '01/02',
    mood: 'Happy',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua....',
    year: 2025,
    month: 0,
  },
  {
    id: '3',
    date: '01/03',
    mood: 'Mad',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua....',
    year: 2025,
    month: 0,
  },
  {
    id: '4',
    date: '01/04',
    mood: 'Sad',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua....',
    year: 2025,
    month: 0,
  },
  {
    id: '5',
    date: '12/10',
    mood: 'Happy',
    content:
      'Had a wonderful holiday season, spent time with family and felt grateful for everything.',
    year: 2024,
    month: 11,
  },
  {
    id: '6',
    date: '12/05',
    mood: 'Normal',
    content:
      'Regular day at work, nothing special happened but feeling content with the progress.',
    year: 2024,
    month: 11,
  },
  {
    id: '7',
    date: '11/20',
    mood: 'Sad',
    content:
      'Feeling a bit down today, the weather is gloomy and things feel overwhelming.',
    year: 2024,
    month: 10,
  },
  {
    id: '8',
    date: '09/15',
    mood: 'Mad',
    content:
      'Frustrated with how things turned out today. Need to take a step back and breathe.',
    year: 2024,
    month: 8,
  },
];
