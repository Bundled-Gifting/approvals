# Bundled proof approval pages

- Each page lives at `p/<slug>/index.html` with images in `p/<slug>/img/`.
- Build new pages by copying the CTNx page (`p/abd4567daaae/index.html`) as the base. It has the standard features every new page must have:
  - Red "Change in progress" overlay on items where the client requested changes (`.wipwrap` / `.wip`).
  - Approved items collapse to a slim green row (`.card.mini`) with a thumbnail; tap "View" to open, "Collapse" to close.
- No "Your items" checklist at the top (Christie decided it was redundant).
- If you copy a different page, port all of the above over. Older pages are left as they are.
- The order number always shows as small, muted "Internal PO #1234" text after the order name in the heading, not full size. Set `ORDER.name` to "Order Name #1234" and use the heading script from the Rocket page (`p/34fb96234786`), which splits off the "#1234" and renders it small.
- Proof images stay at the standard size: no wider than 340px and no taller than 440px (CSS `.single img{width:auto;max-width:min(100%,340px);max-height:440px}`), so tall narrow items like tumblers and bottles don't tower over the page. Exception: stacked proof + actual-size artwork images (e.g. OGIO from Pinnacle) set `tall: true`, which allows up to 680px (`.single img.tall{max-height:680px}` and add `class="tall"` when `it.tall`). New pages must include both CSS rules. Do not set `wide: true` on apparel; they must not stretch to full page width.
- Christie pastes uncleaned vendor proofs. Clean each to just the mock-up: remove "Item #", "imprint color(s)", and the vendor text above collars/hoods (even where it overlaps the garment; redraw a clean edge). Keep anything about size ("25% actual size", "Actual size", "Left chest - actual size", the ruler). No vendor names, mockup IDs, or copyright lines.
- Item names come from the vendor invoice when she provides one, in invoice order.
- Proof backgrounds are plain white: replace any colored or patterned vendor background with white so every item matches. Keep the dashed imprint-area outline on the product.
