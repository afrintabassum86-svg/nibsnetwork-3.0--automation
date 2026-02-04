# Nibs Network - Link-in-Bio System Guide

This system provides a professional Instagram "Link in Bio" dashboard for **nibsnetwork.com**. It automatically syncs Instagram posts, downloads images locally, and uses AI to map them to corresponding blog articles.

---

## 🛠 The Mechanism (How it Works)

The system uses a **Tri-Stage Architecture** to ensure every tile links to the correct article:

1.  **Instagram Sync (Playwright)**: A browser automation tool that scrapes your profile, fetches post metadata (URLs, dates), and downloads images to prevent broken links.
2.  **Blog Crawler (Fetch/Regex)**: A script that crawls all 200+ articles across your 8 blog categories (`Technology`, `Health`, `Sports`, etc.) to create a local search index.
3.  **Visual OCR Engine (Tesseract.js)**: An AI engine that "reads" the headlines physically written inside your Instagram images (e.g., "Apple Watch Hypertension") and matches them against the Blog index.
4.  **Admin Portal (React/Express)**: A web interface allowing you to manually fix any links or headlines that the AI missed.

---

## 📅 Daily Workflow (3 Easy Steps)

Follow these steps whenever you post new content on Instagram:

### **Step 1: Sync Instagram Posts**
Fetch the latest images and posts from your Instagram profile.
```powershell
node instagram-scraper-mcp/scrape.js
```
*   **What happens**: A browser opens at your profile. 
*   **Action**: Scroll down until you see all your new posts. 
*   **Finish**: Close the browser window when done.

### **Step 2: Sync Blog Articles**
Update the system's knowledge of your website's newest articles.
```powershell
node instagram-scraper-mcp/crawl_blog.js
```
*   **Wait**: This takes about 30 seconds to fetch all category pages.

### **Step 3: Auto-Map Headlines**
The "Magic" step. This reads the text in the new images and links them to the blog.
```powershell
node instagram-scraper-mcp/ocr_match.js
```

### **Step 4: Sync Post Timing**
Ensures all posts are sorted correctly by their actual Instagram publish date.
```powershell
node instagram-scraper-mcp/sync_timestamps.js
```
*   **Observe**: You will see it "reading" captions and matching them to URLs in the console.

---

## 🛡 Admin Portal (Manual Control)

For the few posts that the AI cannot read (e.g., very stylistic fonts), use the Admin Portal.

1.  **Start the Admin Server**:
    ```powershell
    node admin-server.js
    ```
2.  **Open the Portal**:
    Visit: `http://localhost:5173/admin`
3.  **Manage**:
    *   **Login**: Use `afrin.tabassum86@gmail.com`
    *   **Filter**: Click "Unmapped" to see posts without a blog link.
    *   **Action**: Click "Manual Map" and paste the correct `nibsnetwork.com` URL.
    *   **Instant Update**: Changes are saved immediately and reflect on the main site.

---

## 📦 Required Dependencies

The project is now optimized. You only need:

| Dependency | Purpose |
| :--- | :--- |
| `react` / `vite` | Core web application. |
| `playwright` | Instagram scraping (browser automation). |
| `tesseract.js` | AI for reading headlines from images (OCR). |
| `express` / `cors` | The background server that allows the Admin Portal to save files. |
| `react-router-dom` | Navigation between Bio page and Admin page. |
| `lucide-react` | Icons for the Admin dashboard. |
| `framer-motion` | Smooth animations. |

---

## 🚀 Deployment / Development
*   **Run Site**: `npm run dev` (Site will be at port 5173)
*   **Stop Systems**: Press `Ctrl + C` in the terminals.

**Support Contact**: Ziaur-786 (Developer)
