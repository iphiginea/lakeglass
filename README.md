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
- Home archive metrics and recent accessions based only on specimens actually saved by the user
- Known find location/date stored separately from inferred origin and age
- Collection import and export
- Installable Progressive Web App
- Offline support through a service worker

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
