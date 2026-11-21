# Pace Study Companion

A static HSC study planner with a dashboard, mixed-subject lecture routine, full-screen focus room, exam timer, PDF library, highlights, revision cards, and local study vault.

## Run it

Open `index.html` in a current browser. For installable/offline app behavior, serve this folder from an HTTPS static host. The PDF reader loads its PDF engine from a CDN the first time it is used.

## Data and large PDFs

Study settings and the vault are saved in this browser. PDF files and their highlights are stored in IndexedDB on this device. The app applies no fixed file-size cutoff; the browser's available storage and memory still limit what a device can keep and open.

## Exam date

The dashboard starts with May 1, 2028 at 10:00 AM Bangladesh time as a planning date. Set the date in the dashboard countdown to match your own exam information.
