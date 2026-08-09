import type { JourneyDef } from "@/types/journey";

// Static Movie Journeys catalog.
//
// Titles, years, release order, and chronological order below were
// verified against Wikipedia's franchise filmographies rather than
// written from memory alone. Each `title` is the official theatrical
// title, used both to resolve the real TMDB movie (services/journeys.ts)
// and to detect when a movie-detail page belongs to a journey — no TMDB
// ids are hardcoded here, since this file can't call the API to verify
// them itself.
//
// A journey only gets a `chronological` or `essential` order when there's
// a real, well-documented distinction to show — Harry Potter, The Lord of
// the Rings, and Mission: Impossible are each told as one continuous
// timeline with no meaningful "essential-only" subset, so they only
// expose "release". Adding a new journey (or a new order for an existing
// one) never requires touching any UI component — see components/features/journeys/.

export const JOURNEYS: JourneyDef[] = [
  {
    id: "mcu-infinity-saga",
    name: "Marvel Cinematic Universe",
    shortName: "MCU",
    description: "The Infinity Saga — 23 films across three phases, from a billionaire in a cave to the fight for the entire universe.",
    aliases: ["marvel", "mcu", "avengers", "infinity saga"],
    availableOrders: ["release", "chronological", "essential"],
    movies: [
      { title: "Iron Man", releaseYear: "2008", releaseOrder: 1, chronologicalOrder: 3, isEssential: true },
      { title: "The Incredible Hulk", releaseYear: "2008", releaseOrder: 2, chronologicalOrder: 5 },
      { title: "Iron Man 2", releaseYear: "2010", releaseOrder: 3, chronologicalOrder: 4 },
      { title: "Thor", releaseYear: "2011", releaseOrder: 4, chronologicalOrder: 6 },
      { title: "Captain America: The First Avenger", releaseYear: "2011", releaseOrder: 5, chronologicalOrder: 1, isEssential: true },
      { title: "The Avengers", releaseYear: "2012", releaseOrder: 6, chronologicalOrder: 7, isEssential: true },
      { title: "Iron Man 3", releaseYear: "2013", releaseOrder: 7, chronologicalOrder: 9 },
      { title: "Thor: The Dark World", releaseYear: "2013", releaseOrder: 8, chronologicalOrder: 8 },
      { title: "Captain America: The Winter Soldier", releaseYear: "2014", releaseOrder: 9, chronologicalOrder: 10, isEssential: true },
      { title: "Guardians of the Galaxy", releaseYear: "2014", releaseOrder: 10, chronologicalOrder: 11, isEssential: true },
      { title: "Avengers: Age of Ultron", releaseYear: "2015", releaseOrder: 11, chronologicalOrder: 13, isEssential: true },
      { title: "Ant-Man", releaseYear: "2015", releaseOrder: 12, chronologicalOrder: 14 },
      { title: "Captain America: Civil War", releaseYear: "2016", releaseOrder: 13, chronologicalOrder: 15, isEssential: true },
      { title: "Doctor Strange", releaseYear: "2016", releaseOrder: 14, chronologicalOrder: 18 },
      { title: "Guardians of the Galaxy Vol. 2", releaseYear: "2017", releaseOrder: 15, chronologicalOrder: 12 },
      { title: "Spider-Man: Homecoming", releaseYear: "2017", releaseOrder: 16, chronologicalOrder: 17 },
      { title: "Thor: Ragnarok", releaseYear: "2017", releaseOrder: 17, chronologicalOrder: 19, isEssential: true },
      { title: "Black Panther", releaseYear: "2018", releaseOrder: 18, chronologicalOrder: 16, isEssential: true },
      { title: "Avengers: Infinity War", releaseYear: "2018", releaseOrder: 19, chronologicalOrder: 20, isEssential: true },
      { title: "Ant-Man and the Wasp", releaseYear: "2018", releaseOrder: 20, chronologicalOrder: 21 },
      { title: "Captain Marvel", releaseYear: "2019", releaseOrder: 21, chronologicalOrder: 2, isEssential: true },
      { title: "Avengers: Endgame", releaseYear: "2019", releaseOrder: 22, chronologicalOrder: 22, isEssential: true },
      { title: "Spider-Man: Far From Home", releaseYear: "2019", releaseOrder: 23, chronologicalOrder: 23 },
    ],
  },
  {
    id: "star-wars-skywalker-saga",
    name: "Star Wars: Skywalker Saga",
    shortName: "Star Wars",
    description: "Nine films, three trilogies — the rise and fall of the Skywalker family, told across two very different orders.",
    aliases: ["star wars", "skywalker", "jedi"],
    availableOrders: ["release", "chronological"],
    movies: [
      { title: "Star Wars: Episode IV - A New Hope", releaseYear: "1977", releaseOrder: 1, chronologicalOrder: 4 },
      { title: "Star Wars: Episode V - The Empire Strikes Back", releaseYear: "1980", releaseOrder: 2, chronologicalOrder: 5 },
      { title: "Star Wars: Episode VI - Return of the Jedi", releaseYear: "1983", releaseOrder: 3, chronologicalOrder: 6 },
      { title: "Star Wars: Episode I - The Phantom Menace", releaseYear: "1999", releaseOrder: 4, chronologicalOrder: 1 },
      { title: "Star Wars: Episode II - Attack of the Clones", releaseYear: "2002", releaseOrder: 5, chronologicalOrder: 2 },
      { title: "Star Wars: Episode III - Revenge of the Sith", releaseYear: "2005", releaseOrder: 6, chronologicalOrder: 3 },
      { title: "Star Wars: The Force Awakens", releaseYear: "2015", releaseOrder: 7, chronologicalOrder: 7 },
      { title: "Star Wars: The Last Jedi", releaseYear: "2017", releaseOrder: 8, chronologicalOrder: 8 },
      { title: "Star Wars: The Rise of Skywalker", releaseYear: "2019", releaseOrder: 9, chronologicalOrder: 9 },
    ],
  },
  {
    id: "harry-potter",
    name: "Harry Potter",
    shortName: "Harry Potter",
    description: "Eight films, one continuous story — from Platform 9¾ to the Battle of Hogwarts.",
    aliases: ["harry potter", "hogwarts", "wizarding world"],
    availableOrders: ["release"],
    movies: [
      { title: "Harry Potter and the Philosopher's Stone", releaseYear: "2001", releaseOrder: 1 },
      { title: "Harry Potter and the Chamber of Secrets", releaseYear: "2002", releaseOrder: 2 },
      { title: "Harry Potter and the Prisoner of Azkaban", releaseYear: "2004", releaseOrder: 3 },
      { title: "Harry Potter and the Goblet of Fire", releaseYear: "2005", releaseOrder: 4 },
      { title: "Harry Potter and the Order of the Phoenix", releaseYear: "2007", releaseOrder: 5 },
      { title: "Harry Potter and the Half-Blood Prince", releaseYear: "2009", releaseOrder: 6 },
      { title: "Harry Potter and the Deathly Hallows: Part 1", releaseYear: "2010", releaseOrder: 7 },
      { title: "Harry Potter and the Deathly Hallows: Part 2", releaseYear: "2011", releaseOrder: 8 },
    ],
  },
  {
    id: "lord-of-the-rings",
    name: "The Lord of the Rings",
    shortName: "LOTR",
    description: "The original trilogy — one continuous journey from the Shire to Mount Doom.",
    aliases: ["lord of the rings", "lotr", "middle earth", "tolkien"],
    availableOrders: ["release"],
    movies: [
      { title: "The Lord of the Rings: The Fellowship of the Ring", releaseYear: "2001", releaseOrder: 1 },
      { title: "The Lord of the Rings: The Two Towers", releaseYear: "2002", releaseOrder: 2 },
      { title: "The Lord of the Rings: The Return of the King", releaseYear: "2003", releaseOrder: 3 },
    ],
  },
  {
    id: "mission-impossible",
    name: "Mission: Impossible",
    shortName: "Mission: Impossible",
    description: "Ethan Hunt's IMF missions, told in a single continuous line from 1996 to today.",
    aliases: ["mission impossible", "ethan hunt", "imf"],
    availableOrders: ["release"],
    movies: [
      { title: "Mission: Impossible", releaseYear: "1996", releaseOrder: 1 },
      { title: "Mission: Impossible II", releaseYear: "2000", releaseOrder: 2 },
      { title: "Mission: Impossible III", releaseYear: "2006", releaseOrder: 3 },
      { title: "Mission: Impossible - Ghost Protocol", releaseYear: "2011", releaseOrder: 4 },
      { title: "Mission: Impossible - Rogue Nation", releaseYear: "2015", releaseOrder: 5 },
      { title: "Mission: Impossible - Fallout", releaseYear: "2018", releaseOrder: 6 },
      { title: "Mission: Impossible - Dead Reckoning Part One", releaseYear: "2023", releaseOrder: 7 },
      { title: "Mission: Impossible - The Final Reckoning", releaseYear: "2025", releaseOrder: 8 },
    ],
  },
];

export function getJourneyDef(id: string): JourneyDef | undefined {
  return JOURNEYS.find((j) => j.id === id);
}

/** Pure title match, no I/O — lets the movie-detail page (and search) find
 *  a journey without ever hitting TMDB just to check membership. Only the
 *  one matched journey (if any) then gets its movies resolved. */
export function findJourneyByTitle(title: string): JourneyDef | undefined {
  const normalized = title.trim().toLowerCase();
  return JOURNEYS.find((journey) =>
    journey.movies.some((m) => m.title.toLowerCase() === normalized)
  );
}

/** Free-text match against journey names/aliases/movie titles — powers the
 *  "Movie Journeys" match card on the search page. */
export function findJourneysByQuery(query: string): JourneyDef[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  return JOURNEYS.filter((journey) => {
    if (journey.name.toLowerCase().includes(normalized)) return true;
    if (journey.shortName.toLowerCase().includes(normalized)) return true;
    if (journey.aliases.some((a) => a.includes(normalized) || normalized.includes(a))) return true;
    return journey.movies.some((m) => m.title.toLowerCase().includes(normalized));
  });
}
