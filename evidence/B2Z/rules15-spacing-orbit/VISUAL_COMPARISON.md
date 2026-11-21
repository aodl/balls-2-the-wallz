# Upright isometric orbit and compact controls

These matched Chromium captures use the application’s real Three.js renderer and payment composer with a synthetic Schema7 Rules14 fixture. They show the same world and camera pose before and after each compass turn. Browser viewport sizes are emulated. The displayed cycle values and player state in these captures are fixture data.

| Compass | Previous screen roll | World-space orbit |
|---|---|---|
| North | [Before](browser/before-1440-N.png) | [After](browser/after-1440-N.png) |
| East | [Before](browser/before-1440-E.png) | [After](browser/after-1440-E.png) |
| South | [Before](browser/before-1440-S.png) | [After](browser/after-1440-S.png) |
| West | [Before](browser/before-1440-W.png) | [After](browser/after-1440-W.png) |

The previous projected image and camera were rolled around the viewing axis. South inverted the cannon, and East and West rotated the terrain and overview diamonds onto their narrow axes. The current camera orbits around world Y with a constant horizontal radius and elevation, looks at the original centre, and uses world up. Flat projection rotates the orthonormal ground basis first and applies the same vertical compression as Three.js afterward. Inverse picking, terrain framing, overview projection, aim and trajectory guides use this basis. Cannon and Diverter meshes and headings are unchanged.

The numerical test compares actual Three.js projection at 16 angles against the browser's ground and height projection. It checks inverse picking, upright projected world height, constant radius and elevation, and settled cardinal tile and overview proportions. The existing toroidal picker checks cell zero, both wrapped axes and the corner. Chromium checks all four compass stops, constant centre and scale, compass target dimensions and disabled state, and a Fire draft through rotation.

| Control | Before | After |
|---|---|---|
| Fire, Shout and payment information | [Desktop](browser/before-1440-fire.png) | [Desktop](browser/after-1440-fire.png) · [320px](browser/after-320-fire.png) |
| Reorient controls and live cycle button | [Desktop](browser/before-1440-diverter.png) | [Desktop](browser/after-1440-diverter.png) · [320px](browser/after-320-diverter.png) |
| Cycles while a keyboard-sized viewport is contracted | — | [320×350](browser/after-320-contracted.png) |
| Owned tile and exact-site construction preview | [Before](browser/before-1440-construction.png) | [After](browser/after-1440-construction.png) |
| South on mobile and the selected ball’s guide | — | [390px South](browser/after-390-S.png) · [Guide](browser/after-1440-guide.png) |

The Shout placeholder keeps its accessible name and live byte feedback. The extra visible label and repeated payment disclaimer are gone. Help retains real ICP, fees, retained-payment, and no-reservation disclosures. The concrete destination risk notice remains in the payment panel. Diverter direction buttons use the shared graphite toolbar treatment with canonical direction names. The cycle button remains above the action panel after contraction and is reachable by hit testing.

[Recorded camera poses and viewport cases](browser/orbit-results.json)
