// Notes didactiques par région — contexte énergétique en 1 phrase.
export interface RegionInfo {
  tag: string
  note: string
}

export const REGION_INFO: Record<string, RegionInfo> = {
  idf: {
    tag: 'la grande consommatrice',
    note: "Douze millions d'habitants, presque aucune centrale. L'Île-de-France importe la quasi-totalité de son électricité des régions voisines.",
  },
  cvl: {
    tag: 'usine nucléaire',
    note: 'Avec quatre centrales sur la Loire, le Centre-Val de Loire produit bien plus qu\'il ne consomme : un exportateur net massif.',
  },
  bfc: {
    tag: 'nucléaire + barrages',
    note: 'Bourgogne-Franche-Comté combine réacteurs et hydraulique du Jura. Position de transit entre Paris, Lyon et l\'Allemagne.',
  },
  nor: {
    tag: 'cœur atomique',
    note: 'Flamanville, Paluel, Penly : la Normandie concentre une part énorme du parc nucléaire français et exporte vers Paris.',
  },
  hdf: {
    tag: 'la plus grande centrale',
    note: "Gravelines est la plus puissante centrale nucléaire d'Europe de l'Ouest. Les Hauts-de-France y ajoutent le plus gros parc éolien du pays.",
  },
  ges: {
    tag: 'la frontalière',
    note: 'Cattenom alimente le Grand Est et s\'échange du courant avec l\'Allemagne, la Belgique et la Suisse en permanence.',
  },
  pdl: {
    tag: 'sans atome',
    note: 'Pas de nucléaire ici. Les Pays de la Loire dépendent du gaz (Cordemais) et des importations — région structurellement déficitaire.',
  },
  bre: {
    tag: 'la péninsule fragile',
    note: 'La Bretagne produit très peu et importe l\'essentiel de son courant par une seule grande ligne : son talon d\'Achille électrique.',
  },
  naq: {
    tag: 'nucléaire + soleil',
    note: 'Civaux et le Blayais côté atome, et de plus en plus de solaire au sud. Nouvelle-Aquitaine est largement exportatrice.',
  },
  occ: {
    tag: 'la renouvelable',
    note: 'Soleil méditerranéen, vent et hydraulique des Pyrénées : l\'Occitanie est la région la plus renouvelable de France.',
  },
  ara: {
    tag: 'la centrale du pays',
    note: 'Nucléaire le long du Rhône et hydraulique alpin : Auvergne-Rhône-Alpes est la première région productrice et le grand exportateur national.',
  },
  pac: {
    tag: 'le bout de ligne',
    note: 'Peu de production locale. PACA est une « péninsule électrique » alimentée par de longues lignes à très haute tension venues du nord.',
  },
  cor: {
    tag: 'l\'île isolée',
    note: 'Pas de nucléaire. La Corse vit du thermique et d\'un câble sous-marin venu d\'Italie : un réseau insulaire à part.',
  },
}
