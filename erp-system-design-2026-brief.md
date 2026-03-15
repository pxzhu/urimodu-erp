# ERP System Design 2026 Brief

## Goal
Redesign the repository's main ERP/HR-facing landing experience into a **2026 AI-native enterprise SaaS** style while keeping practical readability, trust, accessibility, and performance.

## Required Flow
1. Hero section
2. Scroll reveal story
3. Parallax illustration
4. Interactive card section
5. Smooth transition CTA

## Core Direction
- AI-Native ERP
- Human-centered HR operations
- Clean enterprise UI
- Motion-led storytelling (productive motion)
- Data + Workflow + Guidance

## Mandatory UX Principles
- Futuristic but credible
- Practical and implementation-ready
- Motion for comprehension, not decoration
- Responsive on desktop/tablet/mobile
- Keyboard and reduced-motion support

## Visual Baseline Tokens
- Deep Navy `#081225`
- Ink `#0F172A`
- Primary Blue `#4C6FFF`
- Violet `#7A5CFF`
- Mint Accent `#20D6C7`
- Soft Surface `#F7F9FC`

## Motion Baseline
- Micro: ~120ms
- Hover: ~180ms
- Reveal: ~320–360ms
- Panel expand: ~480–520ms
- Section transition: ~600–700ms
- Ambient motion: subtle (16s~20s range)

## Accessibility Baseline
- Focus-visible on interactive elements
- Good contrast on all surfaces
- No information conveyed only by animation
- `prefers-reduced-motion` support
- Mobile-safe interaction (no hover-only critical paths)

## Implementation Note
- Reuse existing project architecture/components/tokens when possible.
- Avoid heavyweight dependencies unless truly necessary.
- Favor transform/opacity for animation performance.
