# Lakeglass

A Lake Michigan beach-glass field guide that uses physical clues and source-backed research to build careful readings of likely object type, historical context, occurrence, and provenance.

**Live app:** https://iphiginea.github.io/lakeglass/

## About

Lakeglass is a field guide, not a photo matcher. Instead of asking for a picture and returning a confident label, it starts with observable evidence: shoreline, color, thickness, form, opacity, surface condition, markings, and surviving diagnostic features.

The result is an evidence-based reading that keeps known provenance separate from historical inference.

## Features

- Guided physical-clue identification flow
- Lake Michigan color occurrence and regional context
- Source-backed research behind each reading
- Local specimen archive using IndexedDB
- Permanent per-color accession sequences, such as `LM.CLEAR.005` and `LM.GREEN.001`
- Issued accession numbers are not reused after a specimen is deleted
- Home archive metrics and recent accessions based only on specimens actually saved by the user
- Full collection access from the home screen
- Known find location/date stored separately from inferred origin and age
- Collection import and export, including accession counters
- Installable Progressive Web App
- Offline support through a service worker

## Accession numbers

Each Lakeglass color family has its own sequence. For example, five clear/white specimens would be `LM.CLEAR.001` through `LM.CLEAR.005`. The first green specimen would still be `LM.GREEN.001`, regardless of how many specimens of other colors are already in the archive.

The accession identifier is assigned when the specimen enters the collection and remains permanent even if descriptive fields are edited later.

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
