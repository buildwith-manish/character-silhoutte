#!/usr/bin/env node
// rounds.csv (or questions.json) -> src/rounds.json
const { refreshRounds, P } = require("./lib");
const path = require("path");

try {
  const { rounds, source } = refreshRounds();
  const withImg = rounds.filter((r) => r.hasImage).length;
  console.log(`[csv] ${rounds.length} rounds from ${source} -> ${path.relative(P.root, P.rounds)} (${withImg} with image, ${rounds.length - withImg} using the placeholder hero)`);
} catch (e) {
  console.error(`[csv] ${e.message}`);
  process.exit(1);
}
