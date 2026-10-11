// Wer steht auf der Größen-Bühne? Namen sind nur Beschriftung; gesprochen wird in Rollen
// ("du", "dein Bruder") – so gehen keine Kindernamen an die Sprach-KI.
import type { Family, FragmentKey } from './data/compare';
import type { UiStrings } from './data/labels';
import type { Settings } from './settings';

export type StagePerson = {
  key: 'you' | 'sibling' | 'mama' | 'papa';
  label: string;
  height: number;
  color: string;
  child: boolean;
  speech: FragmentKey;
};

export function familyView(s: Settings, ui: UiStrings): { people: StagePerson[]; family: Family } {
  const brother = s.sibling.role === 'brother';
  const people: StagePerson[] = [
    { key: 'you', label: s.you.name || ui.you, height: s.you.height, color: '#ffcb05', child: true, speech: 'thatsYou' },
    {
      key: 'sibling', label: s.sibling.name || (brother ? ui.brother : ui.sister), height: s.sibling.height,
      color: '#3fa9f5', child: true, speech: brother ? 'thatsBrother' : 'thatsSister',
    },
    { key: 'mama', label: ui.mama, height: s.mama, color: '#f59ac6', child: false, speech: 'thatsMama' },
    { key: 'papa', label: ui.papa, height: s.papa, color: '#46b04f', child: false, speech: 'thatsPapa' },
  ];
  const family: Family = {
    you: s.you.height,
    sibling: { height: s.sibling.height, role: s.sibling.role },
    mama: s.mama,
    papa: s.papa,
  };
  return { people, family };
}
