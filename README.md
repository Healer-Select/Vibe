# Vibe - Touch Across Distance 📳

A minimal, intimate application for sending emotional signals through touch and vibration.

## 🚀 Deployment Guide

This app is built with a **No-Build Architecture**, meaning it can be served as a static site anywhere.

### 1. Host it (Choose One)
*   **Vercel (Recommended):** Connect your GitHub repo to Vercel. It works out of the box.
*   **Netlify Drop:** Drag and drop your project folder onto [Netlify Drop](https://app.netlify.com/drop).
*   **GitHub Pages:** Enable it in your repo settings.

### 2. Required: Use HTTPS
The **Web Vibration API** and **Service Workers** (PWA features) strictly require a secure connection (HTTPS). Both Vercel and Netlify provide this for free.

### 3. Install on Mobile
To make it feel like a real app:
*   **iOS:** Open URL in Safari -> Share -> **Add to Home Screen**.
*   **Android:** Open URL in Chrome -> Options -> **Install App**.

---

## 🛠️ How it Works
- **Real-time:** Uses Ably to sync vibrations between devices instantly.
- **Haptics:** Uses the `navigator.vibrate` API.
- **Privacy:** No backend database. Pairing is ephemeral and local to your device.

## ⚙️ Configuration
The Ably key is currently hardcoded for convenience. For production, you can move this to an environment variable:
`VITE_ABLY_KEY=your_key_here`
