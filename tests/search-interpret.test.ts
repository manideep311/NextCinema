import { test } from "node:test";
import assert from "node:assert/strict";
import { describeIntent, hasDiscoverIntent, interpretQuery } from "@/lib/search/interpret";
import { matchMoodPhrases } from "@/lib/mood-lexicon";
import { GENRE } from "@/lib/tmdb-genres";

const YEAR = 2026;

test("every example the landing page types out is interpreted", () => {
  assert.equal(interpretQuery("Something like Interstellar", YEAR).similarTo, "Interstellar");

  const dramas = interpretQuery("Slow emotional dramas with a happy ending", YEAR);
  assert.deepEqual(dramas.genreGroups, [[GENRE.drama]]);
  assert.equal(dramas.person, null);

  const twists = interpretQuery("Movies with mind-blowing plot twists", YEAR);
  assert.deepEqual(twists.genreGroups, [[GENRE.thriller, GENRE.mystery]]);
  assert.equal(twists.person, null, "'with <mood>' must not be read as an actor");

  const sad = interpretQuery("I'm sad — cheer me up", YEAR);
  assert.deepEqual(sad.genreGroups, [[GENRE.comedy, GENRE.family]], "'sad' describes the viewer here");
  assert.deepEqual(sad.excludeGenres, [GENRE.horror, GENRE.thriller, GENRE.crime, GENRE.war], "cheering up rules out dark genres");

  const underrated = interpretQuery("Underrated 90s sci-fi", YEAR);
  assert.equal(underrated.quality, "hidden-gem");
  assert.deepEqual(underrated.yearRange, { from: 1990, to: 1999, label: "1990s" });
  assert.deepEqual(underrated.genreGroups, [[GENRE.sciFi]]);
  assert.equal(describeIntent(underrated), "Sci-Fi · 1990s · Hidden gems");
});

test("every quick-pick chip on the landing page is interpreted", () => {
  assert.deepEqual(interpretQuery("Dark and intense", YEAR).genreGroups, [[GENRE.thriller, GENRE.crime, GENRE.drama]]);
  assert.deepEqual(interpretQuery("Slow and emotional", YEAR).genreGroups, [[GENRE.drama]]);
  assert.deepEqual(interpretQuery("Feel-good movies", YEAR).genreGroups, [[GENRE.comedy, GENRE.family]]);
  assert.deepEqual(interpretQuery("Mind-bending thrillers", YEAR).genreGroups, [[GENRE.thriller, GENRE.mystery], [GENRE.thriller]]);
});

test("mood phrases match whole words only", () => {
  assert.deepEqual(matchMoodPhrases("star wars").groups, [], "'war' must not fire inside 'star wars'");
  assert.deepEqual(matchMoodPhrases("transaction").groups, []);
  assert.deepEqual(matchMoodPhrases("rom-com").groups, [[GENRE.romance], [GENRE.comedy]]);
  assert.deepEqual(matchMoodPhrases("sad romantic drama").groups, [[GENRE.drama], [GENRE.romance]]);
});

test("decades, ranges, and bare years", () => {
  assert.deepEqual(interpretQuery("horror from the 80s", YEAR).yearRange, { from: 1980, to: 1989, label: "1980s" });
  assert.deepEqual(interpretQuery("comedies of the 2000s", YEAR).yearRange, { from: 2000, to: 2009, label: "2000s" });
  assert.deepEqual(interpretQuery("thrillers between 1995 and 1990", YEAR).yearRange, { from: 1990, to: 1995, label: "1990–1995" });
  assert.equal(interpretQuery("recent horror", YEAR).yearRange?.from, 2024);
  // A bare year is a title ("1917") unless something else is being asked for.
  const bare = interpretQuery("1917", YEAR);
  assert.equal(bare.yearRange, null);
  assert.equal(hasDiscoverIntent(bare), false);
  assert.equal(interpretQuery("horror 2019", YEAR).yearRange?.from, 2019);
});

test("languages and Indian film industries", () => {
  assert.deepEqual(interpretQuery("tollywood action", YEAR).language, { code: "te", originCountry: "IN", label: "Telugu" });
  assert.equal(interpretQuery("best malayalam thrillers", YEAR).language?.code, "ml");
  assert.equal(interpretQuery("best malayalam thrillers", YEAR).quality, "acclaimed");
  const anime = interpretQuery("anime", YEAR);
  assert.equal(anime.language?.code, "ja");
  assert.deepEqual(anime.genreGroups, [[GENRE.animation]]);
});

test("people: explicit patterns, possessives, and bare names", () => {
  assert.deepEqual(interpretQuery("movies starring Tom Hanks", YEAR).person, { name: "Tom Hanks", role: "cast" });
  assert.deepEqual(interpretQuery("directed by Christopher Nolan", YEAR).person, { name: "Christopher Nolan", role: "director" });
  assert.equal(interpretQuery("Denis Villeneuve movies", YEAR).personCandidate, "Denis Villeneuve");
  assert.equal(interpretQuery("tom hanks", YEAR).personCandidate, "tom hanks");
  assert.equal(interpretQuery("horror movies", YEAR).personCandidate, null);
  assert.deepEqual(interpretQuery("horror movies", YEAR).genreGroups, [[GENRE.horror]]);
});

test("plain titles produce no interpretation (so title search runs)", () => {
  for (const title of ["Dune", "Oppenheimer", "The Godfather"]) {
    const intent = interpretQuery(title, YEAR);
    assert.equal(hasDiscoverIntent(intent), false, title);
    assert.equal(intent.similarTo, null);
    assert.equal(intent.person, null);
  }
});
