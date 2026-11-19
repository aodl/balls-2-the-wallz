# Header and favicon

The noninteractive header image has accessible name “B2Z” and uses the native 1711×622 aspect ratio. It uses the authored white and turquoise palette across both Rules12 and Rules13. The graphite header remains the background. The previous tiny subtitle was removed to give the wordmark and existing controls room.

Chromium checked desktop, 390, 320 and 568×320 viewports, and 200% root text size. The account and status controls stayed visible with at least 44×44 CSS pixel targets. At 320px with 200% text size, the compact status displays its existing ellipsis while the status control retains its accessible text.

Both icon declarations point to same-origin files. The exact legacy asset module served the ICO as `image/x-icon` and the SVG as `image/svg+xml`. Reload retained the declarations and image without an extra app lifecycle or service worker. The original ICO includes 16, 24, 32, 48, 64, 128 and 256 pixel entries. This host's headless Chromium does not expose its desktop tab strip, so its icon selection and chrome appearance were not captured.
