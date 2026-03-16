export const BADGE_THRESHOLDS = [
  { name: 'Apprenti(e) Bobine', minPoints: 0, color: 'bg-stone-500 text-white' },
  { name: 'Pique-Aiguille Débutant', minPoints: 10, color: 'bg-blue-500 text-white' },
  { name: 'As de l\'Ourlet', minPoints: 20, color: 'bg-emerald-500 text-white' },
  { name: 'Dompteur de Machine', minPoints: 30, color: 'bg-teal-500 text-white' },
  { name: 'Ninja du Fil', minPoints: 40, color: 'bg-indigo-500 text-white' },
  { name: 'Maître du Surjet', minPoints: 50, color: 'bg-purple-500 text-white' },
  { name: 'Gourou du Patron', minPoints: 75, color: 'bg-fuchsia-500 text-white' },
  { name: 'Légende du Dé à Coudre', minPoints: 100, color: 'bg-rose-500 text-white' },
  { name: 'Divinité de la Couture', minPoints: 150, color: 'bg-amber-500 text-white' },
];

export const getBadge = (points: number) => {
  return [...BADGE_THRESHOLDS].reverse().find(b => points >= b.minPoints) || BADGE_THRESHOLDS[0];
};
