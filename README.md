# LoadPix — free iPhone web app

A free, installable Safari web app for truck drivers to organize pickup/delivery photos and prepare dispatch messages.

## Install on iPhone
**Once GitHub Pages is enabled**, visit:
https://theonecraigrocks.github.io/LoadPix-web/

Open in Safari → **Share → Add to Home Screen → Add**.

## Private, on-device sessions
Photos and session data are saved to each device's IndexedDB. The site does not upload photos or driver information to a server. Browser storage can be removed by iOS or cleared manually: **do not treat it as a permanent backup**.

## iPhone messages
iOS web apps cannot silently send MMS or preselect the Messages recipient. The driver must choose Messages in the share sheet, verify the number and attachments, and tap Send. iPhone Safari may drop the message body; copy-and-paste fallback is provided. A share-sheet result does not confirm delivery.

## Developer donation
The supplied PayPal handle is @ellerdaddy. The PayPal.me destination is **not independently verified**; confirm recipient before donating.

## Status
The PWA source and automated logic checks exist. **Actual camera capture and file sharing on a physical iPhone have not been tested.** This is a friend-testing preview, not an App Store release. Android source remains in a separate private repository.

## Free deployment
In this public repository choose **Settings → Pages → Build and deployment → Source = GitHub Actions**. Then run the "Verify and publish LoadPix web" workflow (or push a commit). Its Ubuntu runner generates a complete Home Screen PNG, verifies JS/core tests, and publishes **only** the nine site files over HTTPS. No Apple account or macOS runner needed.

## Development
Run `python3 tools/generate-icon.py` before running `python3 -m http.server 8080`. Run `node --test tests/*.test.mjs` for logic tests.

## Paperwork OCR preview

Choose **Take photo** or **Choose photo from phone** in every category. Paperwork and signed-paperwork photos automatically launch an **optional local OCR scan**. A **Scan paperwork** button lets you retry existing photos. OCR suggestions for **trailer number** and **last four digits of BOL** are label-based; they require driver review and explicit confirmation before saving. No guessing from unlabeled numbers. OCR scripts, WebAssembly and the English language model are downloaded from pinned third-party CDN endpoints on first scan; **photos are processed on the device and are not uploaded by the app**. Scanning may fail offline before the engine has been cached, or on incompatible iOS versions; manually editable fields remain available. On-device OCR and Safari sharing still need real-device testing.
