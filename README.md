# SurfSight Device Manager

A desktop application for bulk managing SurfSight devices. Built with Electron + Express.

## Features

- **Manage** — bulk update device billing status (Activate, Deactivate, Suspend) or video quality level
- **Verify** — check whether devices exist in SurfSight and view their current billing status
- **XLSX / CSV Import** — import an Excel or CSV file with an `IMEI` column to populate the device list automatically
- **Remember Me** — optionally save login credentials, encrypted with the OS keychain (Windows DPAPI)
- **Export CSV** — export operation results to a CSV file

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A SurfSight account with API access

## Setup

```bash
# Install dependencies
npm install
```

## Running the App

```bash
# Run in Electron (desktop app)
npm run electron

# Run the backend server only (for development/debugging)
npm run dev-server
```

## Building

```bash
# Package into a Windows installer (outputs to /dist)
npm run dist
```

> **Note:** To use a custom app icon, place an `icon.ico` file in the `public/` folder before building.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SESSION_SECRET` | Secret used to sign session cookies | `surfsight-local-dev-secret` |

For production builds, set `SESSION_SECRET` to a long random string.

## Project Structure

```
├── main.js              # Electron entry point
├── preload.js           # Secure bridge between renderer and main process
├── server/
│   └── index.mjs        # Express API server
└── public/
    ├── login.html/js    # Authentication page
    ├── index.html/js    # Manage devices page
    ├── validate.html/js # Verify devices page
    ├── logs.html        # Run history page
    └── styles.css       # Global stylesheet
```
