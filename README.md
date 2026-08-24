# Lakeglass

A Lake Michigan beach-glass field guide and personal specimen archive that separates observable evidence from historical interpretation.

**Live app:** https://iphiginea.github.io/lakeglass/

## About

Lakeglass is a field guide, not a photo matcher. It starts with what can actually be observed on a weathered fragment: shoreline region, color, thickness, surviving form, opacity, surface condition, markings, diagnostic manufacturing features, and known find provenance.

Every saved accession now has two distinct layers:

1. **Observed specimen record** — the physical clues and known provenance recorded by the collector.
2. **Current interpretation** — probable source, estimated period, dating confidence, historical interest, and evidence notes generated from the current Lakeglass research model.

Interpretations can be re-run later without changing the accession number or known provenance. Earlier interpretations remain in the record as an interpretation history.

## Features

- Guided physical-clue identification flow
- Small flat fragments treated as source-neutral unless stronger flat-glass evidence survives
- Diagnostic follow-ups for finishes, bases, pontils, Owens suction scars, mold seams, vent marks, embossing, milk glass, near-black glass, manganese solarization, and slag
- Optional chemistry/color dating clues for clear, yellow, gray, lavender/amethyst, and canary/Vaseline glass
- Historical period estimates for every color where a defensible range or tendency exists
- Explicit **Dating confidence**: Broad, Moderate, Strong, or Diagnostic
- Three clearly defined 1–10 scales:
  - **Color rarity:** 1 = very common; 10 = exceptionally rare
  - **Form distinctiveness:** 1 = generic fragment; 10 = unusually diagnostic surviving form
  - **Historical interest:** 1 = little chronological information; 10 = unusually informative
- Source-backed research led by the Society for Historical Archaeology Historic Glass Bottle Identification resources plus Lake Michigan regional sources
- Local specimen archive using IndexedDB
- Permanent per-color accession sequences such as `LM.CLEAR.005` and `LM.GREEN.001`
- Issued accession numbers are never reused after deletion
- Structured observation records stored separately from interpretations
- Legacy-record migration that preserves older accessions without inventing observations that were never recorded
- Re-analysis workflow with interpretation history
- “New interpretation available” status when a record was analyzed with an older Lakeglass logic version
- Collection search and filters for color, beach, estimated era, and interpretation status
- Sorting by accession age, rarity, color, or beach
- By-color collection summary
- Collection intelligence for oldest probable specimen, rarest color, most-found beach, most-collected color, dating profile, and unresolved/legacy records
- Known find location/date stored separately from inferred origin and age
- Edit catalog metadata without overwriting historical interpretation
- Archive export/import including accession counters, structured observations, interpretation history, and archive metadata
- Backup awareness showing whether the archive has changed since the last export
- Installable Progressive Web App
- Network-first updating with offline fallback

## Accession numbers

Each Lakeglass color family has its own permanent sequence. Five clear/white specimens would be `LM.CLEAR.001` through `LM.CLEAR.005`. The first green specimen is still `LM.GREEN.001`, regardless of how many specimens of other colors are already in the archive.

The accession color and number are fixed when the specimen enters the collection. Re-analysis may revise the recorded descriptive color or interpretation, but it does not renumber the accession. Deleted accession numbers are not reused.

## Archival model

Known provenance is treated as fact supplied by the collector. Probable source, age, maker, and historical origin remain interpretations.

When an older accession is migrated from an earlier Lakeglass version, its original accession and interpretation are preserved. Missing physical selections are marked as legacy observations rather than guessed. The collector can later re-enter the physical observations and generate a modern interpretation.

## Research approach

Lakeglass prioritizes diagnostic manufacturing evidence over generic shard shape. Pontil scars, finish construction, mold seams, Owens suction scars, air-vent marks, embossing, and documented glass chemistry can carry substantially more chronological weight than color or flatness alone.

Color ranges are used conservatively. Colors such as amber, ordinary green, cobalt, red, and orange explicitly remain broad when color alone cannot support a narrow manufacture date.

## Privacy

Lakeglass has no accounts, no server-side collection database, no camera identification, and no photo storage. Specimen records stay in the local browser unless the user explicitly exports them.

The personal archive starts empty. Lakeglass does not seed demo specimens into a user's collection.

## Stack

- JavaScript
- IndexedDB
- Progressive Web App manifest
- Service worker / offline caching
- Static GitHub Pages deployment

## Install on iPhone

Open the live app in Safari, choose **Share**, then **Add to Home Screen**.

## Portfolio

Read the full case study:

https://iphiginea.github.io/kiahharpool/works/lakeglass/
