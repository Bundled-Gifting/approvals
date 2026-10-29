# Bundled proof approval pages

- Each page lives at `p/<slug>/index.html` with images in `p/<slug>/img/`.
- Build new pages by copying the CTNx page (`p/abd4567daaae/index.html`) as the base. It has the standard features every new page must have:
  - Red "Change in progress" overlay on items where the client requested changes (`.wipwrap` / `.wip`).
  - Approved items collapse to a slim green row (`.card.mini`) with a thumbnail; tap "View" to open, "Collapse" to close.
- No "Your items" checklist at the top (Christie decided it was redundant).
- If you copy a different page, port all of the above over. Older pages are left as they are.
- The order number always shows as small, muted "Internal PO #1234" text after the order name in the heading, not full size. Set `ORDER.name` to "Order Name #1234" and use the heading script from the Rocket page (`p/34fb96234786`), which splits off the "#1234" and renders it small.
