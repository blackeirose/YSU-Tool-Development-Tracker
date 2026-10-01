# Tracker UI maintenance

Applied standard: YSU Small Project UI Standard v1.0, 2026-10-01.
Preserve the existing Tracker system: canvas #f4f7fb, surface #ffffff, text #1f2937,
muted #6b7280, accent #1f4e78, divider #dbe3ec; existing system sans typography,
8px controls, 12px panels, table/list and grid cards. No redesign or new dependencies.
Taxonomy filters reuse native selects with accessible bilingual names, minimum
44px height, #7c847e control boundary and #245bdb focus outline. New family headings
and short descriptions use primary text. Cards support Enter/Space. Existing
responsive wrapping and one-column mobile cards are retained. Desktop production
rendering is checked at release; mobile viewport emulation is unavailable in this
browser environment, so no mobile visual certification is claimed.
