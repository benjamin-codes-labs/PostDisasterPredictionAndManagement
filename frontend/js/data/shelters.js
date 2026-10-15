/**
 * Typhoon shelters per parish. Level 1 shelters open at Typhoon Signal No. 8 or
 * above; level 2 shelters open for evacuations. Facility ids are i18n keys under
 * `shelterFacilities.*`.
 */
export const SHELTERS = Object.freeze([
  { place: 'fatima', level1: ['ilhaVerdeShelter'], level2: ['lusoChineseTechnicalSchoolGym', 'polytechnicUniversityGym'] },
  { place: 'stAnthony', level1: [], level2: ['saoDomingosMarket'] },
  {
    place: 'se',
    level1: ['workersStadium'],
    level2: [
      'tapSeacPavilionA',
      'tapSeacPavilionB',
      'estrelaDoMarSchool',
      'puiChingSchool',
      'matteoRicciCollege',
      'kiangPengSchool',
      'pataneMarket',
      'saoLourencoMarket',
    ],
  },
  { place: 'stLazarus', level1: [], level2: ['puiChingSchool'] },
  { place: 'stLawrence', level1: [], level2: ['salesianInstitute'] },
  { place: 'carmel', level1: ['islandsSocialWorkCentreTaipa'], level2: ['olympicSportsCentre'] },
  { place: 'cotaiReclamation', level1: [], level2: ['eastAsianGamesDome'] },
  { place: 'stFrancisXavier', level1: ['securityForcesAcademy'], level2: ['flyingEagleTrainingBase', 'islandsSocialWorkCentre'] },
]);
