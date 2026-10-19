# LoadPix — free iPhone web app

A free, installable Safari web app for truck drivers to organize their pickup and delivery photos and prepare a dispatch message.

## Open on iPhone
After GitHub Pages is enabled, use the live site (not this GitHub repository page):
**https://theonecraigrocks.github.io/LoadPix-web/**

In Safari tap **Share → Add to Home Screen → Add**. You can then start Pickup/Delivery sessions, take photos, save load details and share images in batches.

## Privacy and sharing
- Captured photos and session data are stored on the **driver's own device**, in browser storage (IndexedDB). The web app does not upload pictures or driver information to a server.
- **There is no automatic MMS sending on iPhone.** Use the iOS share sheet, choose Messages, check the phone number, message body and attachments, then tap Send. Sometimes Safari omits the text or refuses a batch, so the app provides copy-text and photo-saving fallback.
- Browser storage can be cleared by iOS or the user, especially if the web app or Safari data is deleted. This is **not a reliable permanent backup**. Confirm dispatch receives all required pictures and keep important originals elsewhere.
- `@ellerdaddy` is the donation recipient handle provided by the developer, but the constructed PayPal.me destination **has not been verified**. Confirm the recipient before donating.
- The iPhone UI/share-sheet flow **has not been device-tested**. Report bugs during friend testing.

## Open source
This repository contains **only the LoadPix web app and its tests**. The Android app is housed in a different **private** repository. This public website requires no Apple Developer membership, TestFlight, or Mac.

## Development
Run `python3 -m http.server 8080` then open `http://localhost:8080` to test locally on a PC. Run `node --test tests/*.test.mjs` for logic checks.

## Hosting
GitHub Pages needs to be configured once: **Settings → Pages → Build and deployment → Source = GitHub Actions**. The workflow `.github/workflows/deploy.yml` tests and publishes static files over HTTPS. If deployment isn't enabled yet, the website URL above will not work.
