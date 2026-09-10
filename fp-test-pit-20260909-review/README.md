# Fire Pump Test Pit — Interactive Engineering Explorer

Public review prototype for the CAL FIRE Shasta Trinity fire pump test pit study.

## Current prototype

Version: **v0.2**  
Primary page: `index.html`

The viewer reconstructs the reviewed A2.214 geometry as an interactive research model and links it to live screening calculations.

### v0.2 additions

- apparatus / capacity study presets for 500, 1500, and 2000 GPM
- live design-envelope chart comparing current geometry, 1 ft deeper floor, and 2 ft longer still-water bay
- flow-measurement study mode: undefined, in-line meter, or smooth-bore/pitot concept
- 3D dimensional overlay mode
- improved flow vectors, de-aeration/residence-time visualization, suction and vortex study modes
- clearer separation between calculated values, engineering screening, and illustrative/non-CFD graphics
- public-safe geometry basis without embedding the project drawing image

## Engineering boundary

This is an independent design-review visualization, not a construction document, stamped engineering calculation, CFD simulation, or substitute for the Engineer of Record.

The governing apparatus schedule and maximum required test flow remain upstream design decisions. Suction/NPSH, vortex/submergence, flow measurement hardware, and final operational/structural provisions require discipline and manufacturer confirmation.

## Hosting

This folder is committed to the public `blackeirose/YSU-Tool-Development-Tracker` repository. That repository currently carries the `tracker.ycsu.cc` GitHub Pages CNAME.

A dedicated `tools.ycsu.cc` deployment has not yet been established for this prototype. Moving the prototype there requires a confirmed `tools.ycsu.cc` hosting/DNS mapping and deployment path; do not overwrite an existing production mapping without verification.