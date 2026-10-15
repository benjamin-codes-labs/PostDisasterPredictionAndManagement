/** District preview maps, grouped by area. Names are i18n keys under `places.*`. */
export const DISTRICT_GROUPS = Object.freeze([
  {
    id: 'peninsula',
    districts: [
      { id: 'fatima', lat: 22.208067, lng: 113.552284 },
      { id: 'stAnthony', lat: 22.199207, lng: 113.548961 },
      { id: 'se', lat: 22.189307, lng: 113.543228 },
      { id: 'stLazarus', lat: 22.202511, lng: 113.561514 },
      { id: 'stLawrence', lat: 22.192278, lng: 113.561514 },
    ],
  },
  {
    id: 'islands',
    districts: [
      { id: 'carmel', lat: 22.15972, lng: 113.55944 },
      { id: 'cotai', lat: 22.13917, lng: 113.55722 },
      { id: 'stFrancisXavier', lat: 22.1264, lng: 113.5709 },
    ],
  },
  {
    id: 'other',
    districts: [
      { id: 'umHengqin', lat: 22.126188, lng: 113.548951 },
      { id: 'newUrbanZoneA', lat: 22.205474, lng: 113.570029 },
    ],
  },
]);
