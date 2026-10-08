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

## pyRevit catalog — 2026-10-08

Continue Small Project UI Standard v1.0 and the existing tokens above. Reuse
Skills visual cards/list/detail; no third mode, framework or extra service.
Native tool covers use the original public PNG button icons, unmodified, centered
on #edf3f8 with a pyRevit label. These are identity covers, not UI screenshots or
proof of execution. Native Details show purpose, package status, environment,
validation limits and HUB/source/installation links. Scope-specific wrapping and
44px shortcut/detail links preserve usability at narrow widths. Keyboard detail
entry moves focus to Close, traps Tab and returns focus when dismissed.
