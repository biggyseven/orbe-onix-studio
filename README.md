# ORBE & ONIX — Digital Experience Studio

An independent creative practice exploring the intersection of digital design, web development and considered interactions.

**Working line:** Ideas take form.  
**Art direction:** editorial futurism, smoked glass, translucent surfaces, graphite, warm ivory and restrained lavender.

## Public website

- `index.html` — homepage and selected work
- `work.html` — filterable concept archive
- `project.html` — dynamic concept case-study template
- `services.html` — services, delivery process and FAQs
- `studio.html` — studio point of view and principles
- `lab.html` — interactive material playground and visual field notes
- `contact.html` — project brief builder (client-side only)

## Design documentation

- `docs/DESIGN_SYSTEM.md` — visual tokens and interaction principles
- `docs/WORK_SERVICES_DESIGN.md` — detailed desktop/mobile design proposal for Travaux, case studies and Services; content, deliverables, limits, interactions and decisions to arbitrate

## Stack

- Semantic HTML
- CSS custom properties, responsive layouts, glass and material studies
- Vanilla JavaScript for navigation, filters, scroll progress, material controls and brief generation
- Hand-authored SVG and CSS artwork; no generated raster imagery

## Open the website

You do not need to download the code to browse the site. Enable GitHub Pages with **Settings → Pages → Source: GitHub Actions**, then run the existing **Deploy static site to GitHub Pages** workflow from the Actions tab. After its first successful run, open and bookmark: `https://biggyseven.github.io/orbe-onix-studio/`. Full instructions: [`docs/OPEN_THE_SITE.md`](docs/OPEN_THE_SITE.md).

## Run locally

Serve the repository root with any static server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Honest project status

NAYA HOUSE, FORME and FLOWSTATE are **independent concept projects**, not client commissions. The studio is in its early public-building stage.

The contact page currently generates a copyable brief in the browser. It does not transmit or store personal data. No contact API, CRM, payment flow, analytics, CMS or client portal is connected.

## Principles

1. No decorative motion without a purpose.
2. Glass effects must preserve legibility.
3. Strong art direction, restrained interaction.
4. Responsive behavior and reduced-motion support.
5. Clearly distinguish concepts, prototypes and commissioned work.
