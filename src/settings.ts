import type { Lang } from './data/labels';

// Alles hier bleibt auf dem jeweiligen Tablet (localStorage) – Namen und Größen der Familie
// liegen bewusst nicht auf dem Server.
export type Settings = {
  lang: Lang;
  you: { name: string; height: number }; // das Kind, das auf diesem Tablet spielt
  sibling: { name: string; height: number; role: 'brother' | 'sister' };
  mama: number;
  papa: number;
  effects: boolean;
};

export const defaultSettings: Settings = {
  lang: 'de',
  you: { name: '', height: 1.1 },
  sibling: { name: '', height: 1.0, role: 'brother' },
  mama: 1.68,
  papa: 1.8,
  effects: true,
};

export const TEAM_SIZE = 6;
