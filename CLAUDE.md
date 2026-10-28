# Bundled proof approval pages

- Each page lives at `p/<slug>/index.html` with images in `p/<slug>/img/`.
- Build new pages by copying the CTNx page (`p/abd4567daaae/index.html`) as the base. It has the standard features every new page must have:
  - Red "Change in progress" overlay on items where the client requested changes (`.wipwrap` / `.wip`).
  - "Your items" checklist at the top (`#checklist`): every item with a green check / red "Change in progress" / gray "Waiting on you" mark; tapping one jumps to it.
  - Approved items collapse to a slim green row (`.card.mini`) with a thumbnail; tap "View" to open, "Collapse" to close.
- If you copy a different page, port all of the above over. Older pages are left as they are.
