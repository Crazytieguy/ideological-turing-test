export const characters = {
  benGvir: {
    name: 'בן גביר',
    party: '...',
    image: '...',
  },
  benjaminNetanyahu: {
    name: 'בנימין נתניהו',
    party: 'הליכוד',
    image: '...',
  },
  bennyGantz: {
    name: 'בני גנץ',
    party: 'הגדולים',
    image: '...',
  },
  gideonSaar: {
    name: 'גדעון סער',
    party: 'הליכוד',
    image: '...',
  },
  meravMichaeli: {
    name: 'מרב מיכאלי',
    party: 'הפילטר',
    image: '...',
  },
} as const;

export type CharacterId = keyof typeof characters;
