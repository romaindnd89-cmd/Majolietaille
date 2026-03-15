export const BADGE_THRESHOLDS = [
  { name: 'Bronze', minPoints: 0, color: 'bg-amber-700 text-white' },
  { name: 'Silver', minPoints: 50, color: 'bg-stone-400 text-white' },
  { name: 'Gold', minPoints: 100, color: 'bg-yellow-500 text-white' },
  { name: 'Platinum', minPoints: 200, color: 'bg-sky-500 text-white' },
];

export const getBadge = (points: number) => {
  return [...BADGE_THRESHOLDS].reverse().find(b => points >= b.minPoints) || BADGE_THRESHOLDS[0];
};
