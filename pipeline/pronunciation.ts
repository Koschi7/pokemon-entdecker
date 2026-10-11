// Umschreibungen, damit die Stimme deutsche Pokémon-Namen richtig ausspricht.
// Schlüssel = offizieller deutscher Name, Wert = was die Stimme vorlesen soll.
// Übernommen aus der alten App (app/tts.py, ohne die englischen Schlüssel, die nie griffen);
// neue Einträge nach dem Durchhören ergänzen.
export const PRONUNCIATION: Record<string, string> = {
  // Gen 1
  Krabby: 'Krabbi',
  Kingler: 'Kinglär',
  'Nidoran♀': 'Nidoran Weiblich',
  'Nidoran♂': 'Nidoran Männlich',
  Nidoqueen: 'Nidokwien',
  Starmie: 'Starmii',
  Porygon: 'Porigon',
  Aerodactyl: 'Ärodaktül',
  Chaneira: 'Schaneira',
  Kicklee: 'Kickleh',
  Nockchan: 'Nocktschan',
  Mewtu: 'Mjutu',
  // Gen 2
  Hoothoot: 'Hutu',
  Ledyba: 'Lediba',
  Ledian: 'Lediahn',
  Lanturn: 'Lantern',
  Togetic: 'Togetick',
  Granbull: 'Grannbull',
  Octillery: 'Oktilleri',
  Porygon2: 'Porigon Zwei',
  Miltank: 'Miltänk',
  Suicune: 'SSui-kune',
  // Gen 3
  Wingull: 'Wingall',
  Pelipper: 'Pelippär',
  Ninjask: 'Nindschask',
  Wailmer: 'Weilmär',
  Wailord: 'Weilord',
  Spoink: 'Schpoink',
  Shuppet: 'Schuppet',
  Banette: 'Banett',
  Relicanth: 'Relikant',
  Regirock: 'Redschi-Rock',
  Regice: 'Redschi-Eis',
  Registeel: 'Redschi-Stiel',
  Kyogre: 'Kiogre',
  Rayquaza: 'Räi-kwasa',
  Jirachi: 'Dschiraschi',
  Deoxys: 'Deoksis',
  // Gen 4
  Shaymin: 'Scheimin',
  'Porygon-Z': 'Porigon Zett',
  // Gen 5
  Reshiram: 'Reschiram',
  // Gen 6
  Vivillon: 'Wiwijon',
};

export function spoken(nameDe: string): string {
  return PRONUNCIATION[nameDe] ?? nameDe.replace('♀', ' Weiblich').replace('♂', ' Männlich');
}
