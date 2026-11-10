# Architecture

The current release is a static multi-page website.

- HTML pages are top-level routes.
- `assets/site.css` contains shared tokens, layout primitives, responsive rules and components.
- `assets/site.js` contains progressive enhancements: mobile navigation, project filters, reveal behavior and case-study data.
- `assets/*.svg` contains hand-authored vector artwork.

There is no backend, database, CMS, contact form processor or authentication in this version. The contact form validates locally and opens a prefilled email addressed to orbeonix@gmail.com through the visitor's configured mail application. The visitor must review and send the message; no form data is transmitted or stored by the site.

## Deployment
GitHub Actions publishes the repository root to GitHub Pages on pushes to `main`.
