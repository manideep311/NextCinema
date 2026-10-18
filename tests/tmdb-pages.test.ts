import { test } from "node:test";
import assert from "node:assert/strict";
import { otherIndustryTmdbPages } from "@/lib/tmdb-pages";
import { MAX_TMDB_PAGE, pageParamSchema } from "@/lib/validation";

test('"Other" maps app page n to TMDB pages 2n-1 and 2n', () => {
  assert.deepEqual(otherIndustryTmdbPages(1), [1, 2]);
  assert.deepEqual(otherIndustryTmdbPages(7), [13, 14]);
  assert.deepEqual(otherIndustryTmdbPages(250), [499, 500]);
});

test('"Other" never requests a TMDB page above the cap, for any page the API accepts', () => {
  assert.equal(otherIndustryTmdbPages(251), null);
  for (let page = 1; page <= MAX_TMDB_PAGE; page++) {
    assert.ok(pageParamSchema.safeParse(String(page)).success);
    const pages = otherIndustryTmdbPages(page);
    if (pages) for (const tmdbPage of pages) assert.ok(tmdbPage >= 1 && tmdbPage <= MAX_TMDB_PAGE, `page ${page} → ${tmdbPage}`);
  }
});
