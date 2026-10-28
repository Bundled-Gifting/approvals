# Bundled proof approval pages

- Each page lives at `p/<slug>/index.html` with images in `p/<slug>/img/`.
- Build new pages by copying the CTNx page (`p/abd4567daaae/index.html`) as the base. It already has the red "Change in progress" overlay. If you copy a different page, port that overlay over: the `.wipwrap` / `.wip` CSS and the block before `host.appendChild(card)` that adds the overlay when an item's status is "changes".
- Every new page must have the "Change in progress" overlay. Older pages are left as they are.
