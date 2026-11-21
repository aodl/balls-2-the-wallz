# Rules15 interaction captures

These are actual Chromium/Three.js captures of a populated, synthetic Schema7
fixture with the exact Rules15 configuration. The baseline is the source of the
installed frontend. Mainnet certificate checks and certified reads are separate
from these controlled journeys. The touch runs use Chromium emulation.

## Tile state at the same camera scale

| View | Installed frontend baseline | Candidate |
|---|---|---|
| Desktop far zoom | [Before](browser/before-1440-hover-2.png) | [After](browser/after-1440-hover-2.png) |
| 320px far zoom | [Before](browser/before-320-hover-2.png) | [After](browser/after-320-hover-2.png) |
| Desktop intermediate and near zoom | — | [Intermediate](browser/after-1440-hover-18.png) · [Near](browser/after-1440-hover-48.png) |
| Owned tile inside Rules15 clearance | [Before](browser/before-1440-invalid.png) | [Crossed tile and reason](browser/after-1440-invalid.png) |
| Eligible owned tile | — | [Automatic Build Cannon](browser/after-1440-auto-build.png) · [320px](browser/after-320-auto-build.png) · [Far destination](browser/after-320-far-destination.png) |

The compact gold destination and pale hover markers remain distinct when the
tile grid fades. At closer zoom, the contrasting stroke traces the actual
polygon. The crossed invalid tile is paired with the Rules15 clearance reason
and unavailable Copy. The selected owned tile and its prepared instructions
share the same canonical cell.

## Distant movement and docked access

Cannon 1 at cell 4004 and Diverter 1 at cell 4007 were each selected near their
source. The camera then travelled to cell 500500, outside both source
viewports. Selecting the destination moved the panel without changing the
camera. At 320px the body scrolls within the same card and the inbound guide
is clipped before the panel edge. Keyboard moves, Keep, Update and exact
native amount, recipient and memo copying passed for both structures at all
three widths.

[Cannon Move](browser/cannon-1440-distant-move.png) · [Diverter Move](browser/diverter-1440-distant-move.png) · [320px Diverter and memo after scrolling](browser/diverter-320-distant-move.png) · [320px dock while the destination is offscreen](browser/cannon-320-offscreen-dock.png) · [320px contracted viewport](browser/cannon-320-contracted-move.png)

## Compass and turret frames

The compass faces are 34px with 44px touch targets. Black North, white East
and West, and grey South follow their respective world directions. The
circular buttons move around the same centre as the map and stay upright.
Frame captures use controlled timestamps with the real camera and renderer.
The assertion covered every directed cardinal turn and retargeting while
in flight.

[North-up](browser/compass-settled-N.png) · [East-up](browser/compass-settled-E.png) · [South-up](browser/compass-settled-S.png) · [West-up](browser/compass-settled-W.png)

[North to East at 76ms](browser/compass-NE-early.png) · [130ms](browser/compass-NE-intermediate.png) · [236ms](browser/compass-NE-late.png)

The cannon's upper assembly eased from its verified heading to the saved
draft. The fixture measured displayed radians of 0, 1.153 and 2.356 at entry,
midpoint and end. The fixed base matrix and `FIRE 1 135 1` draft memo stayed
constant. After closing, the upper started back toward the verified heading.
Reopening halfway used the displayed angle as the new starting point.
A direct aim change updated in one frame. The node tests cover wrap through
zero, reduced motion and authoritative relocation.

[Entry](browser/turret-enter-mid.png) · [Exit](browser/turret-exit-mid.png) · [Interrupted return](browser/turret-interrupted.png) · [Browser assertions](browser/interaction-results.json)

The retained [320×640 quantity pose at 347.15°](browser/quantity-320-347.15.png)
and [contracted East-up setup](browser/after-320-contracted.png) use the
same renderer. Physical touch hardware and P09 dense-scene performance
remain unqualified.
