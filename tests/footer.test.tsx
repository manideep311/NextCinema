import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "@/components/layout/footer";

test("the shared footer carries TMDB's logo, link and required notice", () => {
  const html = renderToStaticMarkup(<Footer />);
  assert.ok(html.includes("This product uses the TMDB API but is not endorsed or certified by TMDB."));
  assert.match(html, /href="https:\/\/www\.themoviedb\.org\/"/);
  assert.match(html, /tmdb-logo\.svg/);
  assert.match(html, /alt="The Movie Database \(TMDB\)"/);
});

test("the footer is rendered once, from the root layout, so every route shows the attribution", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /<Footer \/>/);
  // Pages must not add their own copy (it would render twice).
  assert.doesNotMatch(readFileSync("app/page.tsx", "utf8"), /<Footer/);
});
