import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FRANCHISE_KIND_LABELS,
  JOURNEY_DEFINITIONS,
  availableOrdersFor,
  definitionHash,
  findFranchiseDefinitionForMovie,
  matchesJourneyQuery,
} from "@/lib/journeys/definitions";
import { journeyIdSchema } from "@/lib/validation";

test("every journey id is a unique, URL-safe slug", () => {
  const ids = JOURNEY_DEFINITIONS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(journeyIdSchema.safeParse(id).success, id);
});

test("every journey type is represented", () => {
  const types = new Set(JOURNEY_DEFINITIONS.map((d) => d.type));
  for (const type of ["franchise", "genre", "theme", "mood", "discovery"]) assert.ok(types.has(type as never), type);
  assert.ok(!types.has("language" as never), "language journeys were removed");
});

test("definitions are internally consistent", () => {
  for (const d of JOURNEY_DEFINITIONS) {
    // Franchises can be two films (membership is certain); ranked journeys need a real list.
    assert.ok(d.minimumMovies >= (d.type === "franchise" ? 2 : 3), `${d.id} minimumMovies`);
    if (d.selection) assert.ok(d.selection.maxMovies >= d.minimumMovies, `${d.id} maxMovies < minimum`);

    if (d.source.kind === "curated") {
      const releaseOrders = d.source.movies.map((m) => m.releaseOrder);
      assert.deepEqual([...releaseOrders].sort((a, b) => a - b), releaseOrders.map((_, i) => i + 1), `${d.id} release order`);
      if (d.source.orders.includes("chronological")) {
        const chrono = d.source.movies.map((m) => m.chronologicalOrder).filter((n): n is number => n !== undefined);
        assert.equal(new Set(chrono).size, chrono.length, `${d.id} duplicate chronological position`);
      }
      if (d.source.orders.includes("essential")) assert.ok(d.source.movies.some((m) => m.isEssential), `${d.id} essential`);
      if (!d.source.orders.includes("chronological")) assert.ok(d.source.movies.every((m) => m.chronologicalOrder === undefined), `${d.id} invents a timeline`);
    } else {
      // Only curated franchises may offer alternate orders.
      assert.deepEqual(availableOrdersFor(d), ["release"]);
    }
  }
});

test("franchise journeys cover every kind of franchise, each labeled", () => {
  const franchises = JOURNEY_DEFINITIONS.filter((d) => d.type === "franchise");
  const kinds = new Set(franchises.map((d) => d.franchiseKind));
  for (const kind of Object.keys(FRANCHISE_KIND_LABELS)) assert.ok(kinds.has(kind as never), kind);
  for (const d of franchises) assert.ok(d.franchiseKind, `${d.id} has no franchise kind`);
  assert.ok(franchises.length >= 150, `only ${franchises.length} franchise journeys`);
  // Every collection source names exactly one TMDB collection per string, and none repeat across journeys.
  const ids = franchises.flatMap((d) => (d.source.kind === "collection" ? d.source.collections.map((c) => c.id) : []));
  assert.equal(new Set(ids).size, ids.length, "a TMDB collection is used by two journeys");
  assert.ok(ids.every((id) => Number.isInteger(id) && id > 0));
});

test("definition hash is stable and changes with the definition", () => {
  const d = JOURNEY_DEFINITIONS[0];
  assert.equal(definitionHash(d), definitionHash({ ...d }));
  assert.notEqual(definitionHash(d), definitionHash({ ...d, minimumMovies: d.minimumMovies + 1 }));
});

test("franchise lookup works from title, collection name, or keywords — without TMDB", () => {
  assert.equal(findFranchiseDefinitionForMovie({ title: "Avengers: Endgame" })?.id, "mcu-infinity-saga");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Furious 7", collectionName: "The Fast and the Furious Collection" })?.id, "fast-and-furious");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Creed II", collectionName: "Creed Collection" })?.id, "rocky-creed");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Aquaman", keywords: ["DC Extended Universe (DCEU)"] })?.id, "dc-extended-universe");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Pushpa 2 - The Rule", collectionName: "Pushpa Collection" })?.id, "pushpa");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Bāhubali 2: The Conclusion", collectionName: "Bāhubali Collection" })?.id, "baahubali");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Pathaan" })?.id, "yrf-spy-universe");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Anything", collectionId: 137696 })?.id, "monsters-inc", "matched by collection id");
  // Most specific journey wins when a movie is in several.
  assert.equal(findFranchiseDefinitionForMovie({ title: "Harry Potter and the Goblet of Fire" })?.id, "harry-potter");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Fantastic Beasts: The Secrets of Dumbledore" })?.id, "wizarding-world");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Avengers: Endgame", collectionName: "The Avengers Collection" })?.id, "the-avengers");
  assert.equal(findFranchiseDefinitionForMovie({ title: "The Nun II", collectionName: "The Nun Collection" })?.id, "conjuring-universe");
  assert.equal(findFranchiseDefinitionForMovie({ title: "Some Film", collectionName: "Municipalities Collection" }), undefined);
});

test("search matching uses names/aliases, and short aliases only match whole words", () => {
  const mcu = JOURNEY_DEFINITIONS.find((d) => d.id === "mcu-infinity-saga")!;
  assert.ok(matchesJourneyQuery(mcu, "marvel"));
  assert.ok(matchesJourneyQuery(mcu, "Iron Man"));
  const dc = JOURNEY_DEFINITIONS.find((d) => d.id === "dc-extended-universe")!;
  assert.ok(matchesJourneyQuery(dc, "dc"));
  assert.ok(!matchesJourneyQuery(dc, "documentary"));
});
