---
layout: post
title: Bringing GCompris Back to macOS with iCompris
---

I was inspired by [@meimakes](https://x.com/meimakes) and wanted a meaningful open-source project where I could learn by shipping.

After trying some of their creations, I came across [GCompris](https://www.gcompris.net/), an educational suite I immediately respected for its mission and quality.

Then I noticed something practical for my own household: we are all-in on Mac, and the macOS release path had not been updated in a while.

That became the motivation for **iCompris**.

## Why iCompris

iCompris is my macOS-focused fork of GCompris, with a simple goal: make it usable and installable on modern Mac systems again.

This is about extending access, not replacing the original project.

## What I worked on

- Reproducible macOS arm64 build flow
- DMG packaging workflow for internal distribution
- Fixes for modern macOS launch/signing issues
- Updated documentation for repeatable local builds

Most of the effort was build and release engineering, not UI changes.

## Biggest challenge

The toughest part was packaging reliability on modern macOS with current Qt tooling, especially around plugin layouts and code-sign integrity.

One failure mode looked like this at launch:

- `Code Signature Invalid`
- `Namespace CODESIGNING, Code 2 Invalid Page`

Fixing bundle signing consistency was the turning point.

## Respect to the original project

Huge respect to Bruno Coudoin, the KDE Education team, and all GCompris contributors. iCompris stands on their work.

## Repository

[github.com/johndlloyd/icompris](https://github.com/johndlloyd/icompris)
