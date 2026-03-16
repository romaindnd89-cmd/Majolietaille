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

export const getCustomerNumber = (client: any) => {
  if (!client) return '---';
  
  let initials = '';
  const first = client.firstName?.trim() || '';
  const last = client.lastName?.trim() || '';
  
  if (last && first) {
    initials = `${last.charAt(0)}${first.charAt(0)}`;
  } else if (last) {
    initials = last.substring(0, 2);
  } else if (first) {
    initials = first.substring(0, 2);
  } else if (client.displayName) {
    const parts = client.displayName.split(' ').filter(Boolean);
    if (parts.length > 1) {
      initials = `${parts[parts.length - 1].charAt(0)}${parts[0].charAt(0)}`;
    } else {
      initials = parts[0].substring(0, 2);
    }
  } else {
    initials = 'XX';
  }
  
  const id = client.id || client.uid || '';
  const hash = id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const digit = hash % 10;
  
  return `${initials.toUpperCase()}${digit}`;
};
