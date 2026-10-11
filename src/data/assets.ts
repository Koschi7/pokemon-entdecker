// Dateipfade der Assets. Sie liegen auf derselben Domain wie die App (erzeugt von der Pipeline in generated/).
type Id = string | number;

export const asset = {
  data: '/data/pokemon.json',
  bbox: '/data/bbox.json', // sichtbarer Umriss je Artwork [x, y, w, h] als Anteil
  thumb: (id: Id) => `/img/thumb/${id}.webp`,
  art: (id: Id, shiny = false) => `/img/${shiny ? 'shiny' : 'art'}/${id}.webp`,
  cry: (id: Id) => `/audio/cry/${id}.m4a`,
  sentence: (id: Id) => `/audio/de/satz/${id}.m4a`,
  name: (id: Id) => `/audio/de/name/${id}.m4a`,
  fragment: (key: string) => `/audio/de/frag/${key}.m4a`,
  typeIcon: (type: string) => `/types/${type}.svg`,
};
