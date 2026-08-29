export type FirstNationsEvent = {
  year: string;
  title: string;
  detail: string;
};

export type FirstNationsPlace = {
  id: string;
  name: string;
  area: string;
  category: string;
  geo: [number, number];
  summary: string;
  events: FirstNationsEvent[];
  sourceLabel: string;
  sourceUrl: string;
};

// This is deliberately a small, public-history collection. It contains civic,
// community and cultural places already published by Aboriginal organisations
// or the City of Sydney; it must not be expanded with AHIMS or restricted sites.
export const FIRST_NATIONS_PLACES: FirstNationsPlace[] = [
  {
    id: 'australia-hall',
    name: 'Australia Hall',
    area: 'Sydney',
    category: 'Civil rights',
    geo: [151.2091, -33.8779],
    summary:
      'A landmark of Aboriginal political organising, where people gathered while official celebrations marked 150 years of colonisation.',
    events: [
      {
        year: '1938',
        title: 'Day of Mourning',
        detail:
          'On 26 January, Aboriginal activists met here to demand full citizenship rights and equality. It became one of the most important civil-rights protests in Australian history.',
      },
    ],
    sourceLabel: 'City of Sydney Archives',
    sourceUrl: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/1913508',
  },
  {
    id: 'redfern-park',
    name: 'Redfern Park',
    area: 'Redfern',
    category: 'Reconciliation',
    geo: [151.2060445, -33.8946058],
    summary:
      'A major public gathering place in the heart of a community central to Aboriginal activism, organisations and culture in Sydney.',
    events: [
      {
        year: '1992',
        title: 'The Redfern Speech',
        detail:
          'Prime Minister Paul Keating delivered a landmark speech here acknowledging the dispossession, violence and discrimination experienced by Aboriginal and Torres Strait Islander peoples.',
      },
    ],
    sourceLabel: 'City of Sydney — History of Redfern Park',
    sourceUrl:
      'https://www.cityofsydney.nsw.gov.au/histories-local-parks-playgrounds/history-redfern-park',
  },
  {
    id: 'tranby',
    name: 'Tranby',
    area: 'Glebe',
    category: 'Education',
    geo: [151.1808, -33.8787],
    summary:
      'A long-running Aboriginal-controlled education organisation that has supported community leadership and adult learning from its Glebe terrace.',
    events: [
      {
        year: '1962',
        title: 'Co-operative established',
        detail:
          'The Co-operative for Aborigines Limited was established, forming the organisation now known as Tranby Aboriginal Co-operative Limited.',
      },
    ],
    sourceLabel: 'City of Sydney Archives — Tranby',
    sourceUrl: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/752197',
  },
  {
    id: 'aboriginal-legal-service',
    name: 'First Aboriginal Legal Service',
    area: 'Redfern',
    category: 'Justice',
    geo: [151.2016295, -33.8896598],
    summary:
      'The Regent Street shopfront became the base for a pioneering community-controlled legal service created in response to police harassment and unequal access to justice.',
    events: [
      {
        year: '1970',
        title: 'A legal first',
        detail:
          'The Aboriginal Legal Service opened its first shopfront at 142 Regent Street—the first free, community-controlled legal-aid service of its kind in Australia.',
      },
    ],
    sourceLabel: 'City of Sydney Archives — First Nations Places',
    sourceUrl: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/1913508',
  },
  {
    id: 'foundation-aboriginal-affairs',
    name: 'Foundation for Aboriginal Affairs',
    area: 'Haymarket',
    category: 'Community',
    geo: [151.2030523, -33.8837272],
    summary:
      'This George Street centre offered practical assistance and became an important social and organising space for Aboriginal people in Sydney.',
    events: [
      {
        year: '1964',
        title: 'Foundation formed',
        detail:
          'The Foundation for Aboriginal Affairs was established to provide help with housing, work, education, welfare, legal, medical and financial needs.',
      },
      {
        year: '1966',
        title: 'A permanent city home',
        detail:
          'The Foundation purchased the building at 810–812 George Street, creating a lasting centre for services, gatherings and community life.',
      },
    ],
    sourceLabel: 'City of Sydney Archives — First Nations Places',
    sourceUrl: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/1913508',
  },
  {
    id: 'bennelong-point-camp',
    name: 'Bennelong Point camp',
    area: 'Circular Quay',
    category: 'Community life',
    geo: [151.2149, -33.857],
    summary:
      'Long after colonisation, Aboriginal people continued to live and maintain connections around Warrane (Sydney Cove). This pin marks the public Bennelong Point area, not a restricted site.',
    events: [
      {
        year: '1879–81',
        title: 'Camp near the boatsheds',
        detail:
          'Historical records describe an Aboriginal camp near the Government Boatsheds on the eastern side of Circular Quay during these years.',
      },
    ],
    sourceLabel: 'City of Sydney Archives — First Nations Places',
    sourceUrl: 'https://archives.cityofsydney.nsw.gov.au/nodes/view/1913508',
  },
  {
    id: 'alexandria-park',
    name: 'Alexandria Park',
    area: 'Alexandria',
    category: 'Sport',
    geo: [151.1978154, -33.9000448],
    summary:
      'This park has a strong connection with Aboriginal rugby league and the Redfern All Blacks, one of the country’s oldest Aboriginal rugby league clubs.',
    events: [
      {
        year: '1940s',
        title: 'Redfern All Blacks',
        detail:
          'From the 1940s, the Redfern All Blacks trained and played at Alexandria Park, building sporting excellence and community pride.',
      },
    ],
    sourceLabel: 'City of Sydney — History of Alexandria Park',
    sourceUrl:
      'https://www.cityofsydney.nsw.gov.au/histories-local-parks-playgrounds/history-alexandria-park',
  },
  {
    id: 'yabun-victoria-park',
    name: 'Yabun at Victoria Park',
    area: 'Camperdown',
    category: 'Living culture',
    geo: [151.192359, -33.886642],
    summary:
      'Yabun is a major annual gathering celebrating the survival of Aboriginal and Torres Strait Islander cultures with music, dance, ideas and community.',
    events: [
      {
        year: '2003',
        title: 'Yabun founded',
        detail:
          'Gadigal Information Service Aboriginal Corporation founded Yabun Festival. It has grown into a major one-day celebration and gathering on 26 January.',
      },
    ],
    sourceLabel: 'Yabun Festival / City of Sydney What’s On',
    sourceUrl: 'https://whatson.cityofsydney.nsw.gov.au/events/yabun-festival',
  },
  {
    id: 'yininmadyemi',
    name: 'Yininmadyemi — Thou didst let fall',
    area: 'Hyde Park',
    category: 'Public art',
    geo: [151.2105, -33.8755],
    summary:
      'Tony Albert’s memorial honours Aboriginal and Torres Strait Islander people who served in Australia’s military and remembers sacrifice, survival and unequal treatment.',
    events: [
      {
        year: '2015',
        title: 'Memorial unveiled',
        detail:
          'The artwork was installed in Hyde Park. Four standing bullets and three fallen shells represent those who survived and those who were lost.',
      },
    ],
    sourceLabel: 'City of Sydney — Yininmadyemi',
    sourceUrl:
      'https://www.cityofsydney.nsw.gov.au/monuments-and-memorials/yininmadyemi-thou-didst-let-fall',
  },
];

