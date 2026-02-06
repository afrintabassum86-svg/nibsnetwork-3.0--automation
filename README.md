# NibsNetwork Blogsite Automation Platform

Welcome to the official documentation for the **NibsNetwork Link-in-Bio & Automation Hub**. This platform serves as the central bridge between the [NibsNetwork Instagram](https://www.instagram.com/nibsnetwork/) and the [NibsNetwork Blog](https://nibsnetwork.com/), ensuring that every social media post is instantly and accurately linked to its corresponding article.

---

## 🏗️ Platform Overview

We are using a **Cloud-Native Automation & Link Management Platform** specifically designed for high-traffic media organizations like NibsNetwork. It is built to handle content synchronization, AI-powered article mapping, and real-time data delivery.

### Core Infrastructure
*   **Production Hosting**: [Vercel](https://vercel.com/) (High-performance global CDN).
*   **Database & Backend**: [Supabase](https://supabase.com/) (Postgres DB, Real-time sync, and Secure Auth).
*   **Storage**: Supabase Storage (Storing Instagram assets to ensure high uptime).
*   **Automation Engine**: Playwright & Node.js (Background scrapers and sync engines).
*   **CI/CD**: GitHub Actions (Scheduled automation and seamless deployments).

---

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Blazing fast user interface and dynamic content loading. |
| **Database** | PostgreSQL (Supabase) | Robust storage for posts, articles, and mapping data. |
| **Automation** | Playwright | Reliable browser automation for scraping Instagram and Blog tags. |
| **AI/ML** | Tesseract.js (OCR) | AI engine that "reads" headlines from images to auto-map articles. |
| **Styling** | Vanilla CSS3 | Custom-built, Forbes-inspired design with premium aesthetics. |
| **Backend API** | Express.js | Local admin server for script execution and file management. |

---

## 📖 How to Use the Platform

### 1. For Visitors (The Front End)
The public-facing site is a sleek, grid-based "Link in Bio" page.
- **Access**: `nibsnetwork-automation.vercel.app` (or your custom domain).
- **Functionality**: Click on any Instagram image to be redirected instantly to the relevant article on `nibsnetwork.com`.

### 2. For Administrators (The Admin Portal)
The Admin Portal is accessible at `/admin` and provides full control over the content.
- **Login**: Authorized access via Supabase Auth (e.g., `afrin.tabassum86@gmail.com`).
- **Manual Mapping**: If the AI missed a link, you can manually paste a URL and click **Map**.
- **Sync Controls**: Buttons to trigger automation scripts directly from the browser (requires the local admin server).

### 3. Data Synchronization (The "Magic" Scripts)
The system stays up-to-date using four key scripts:

| Script Name | Command | Description |
| :--- | :--- | :--- |
| **Insta Sync** | `npm run sync-insta` | Scrapes the latest posts and images from Instagram. |
| **Blog Sync** | `npm run sync-blog` | Crawls NibsNetwork.com to find the newest articles. |
| **Auto-Map** | `npm run auto-map` | uses AI to match Instagram images to Blog articles. |
| **Admin Server**| `npm run admin-server`| powers the Admin Portal's ability to run scripts. |

---

## 🗓️ Standard Workflow (Daily Checklist)

To keep your "Link in Bio" perfectly synced with your Instagram, follow this simple workflow:

1.  **Run Sync**: Click **Run Insta Sync** in the Admin Portal to fetch new posts.
2.  **Crawl Blog**: Click **Run Blog Sync** to ensure the latest articles are indexed.
3.  **Auto-Link**: Click **Run Auto-Map**. The AI will link posts with matching headlines.
4.  **Review**: Check the "Unmapped" tab in the Admin Portal. For any posts the AI couldn't read, manually paste the article link.

---

## 🔒 Security & Performance
- **Image Persistence**: Unlike other platforms that link directly to Instagram (where links often break), we download and store images in Supabase to ensure they always load for your users.
- **Edge Delivery**: The site is deployed to Vercel's Edge Network, meaning it loads instantly anywhere in the world.
- **Secure Auth**: Only authenticated administrators can modify mappings or run scripts.

---

**Developed by**: Ziaur-786 (NibsNetwork Tech Team)
**Status**: Production Ready 🚀
