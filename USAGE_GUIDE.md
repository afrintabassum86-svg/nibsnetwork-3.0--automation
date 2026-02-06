# NibsNetwork Automation: User Operating Manual

This guide explains how to operate the NibsNetwork Link-in-Bio system.

## 🚀 The Platforms We Use

Our system is built on a high-availability cloud infrastructure:

1.  **Vercel**: The "Front Door" - This is where your public site lives.
2.  **Supabase**: The "Brain" - A powerful database that stores every post and article.
3.  **GitHub Actions**: The "Heartbeat" - Automatically runs sync scripts on a schedule.
4.  **Playwright AI**: The "Eyes" - Scrapes Instagram to see your new content.
5.  **Tesseract AI**: The "Reader" - Reads headlines inside images to link them automatically.

---

## 🛠 Operation Manual

### 1. Daily Syncing
The system is designed to be **Zero-Touch**. However, if you want to force a sync immediately after posting to Instagram:

1.  Open your **Admin Portal** (`/admin`).
2.  Click the **"Sync Instagram"** button. This will start the scraper.
3.  Once finished, click **"Sync Blog"**. This fetches your latest articles.
4.  Click **"Auto-Map"**. The AI will scan the images and link them.

### 2. Manual Mapping (Handling Exceptions)
Sometimes your Instagram images might use a font the AI can't read perfectly. In these cases:

1.  Go to the **"Unmapped"** tab in the Admin Portal.
2.  Find the new post.
3.  Click **"Manage Link"**.
4.  Paste the URL of the article from `nibsnetwork.com` that matches this post.
5.  Click **"Save"**. The change is live instantly.

### 3. Monitoring
You can monitor the health of the system via the **Output Log** at the bottom of the Admin Portal. It will show you exactly what the AI is "reading" and linking in real-time.

---

## ❓ Frequently Asked Questions

**Q: Where do the images come from?**
A: We download them from Instagram and store them in **Supabase Storage**. This means if Instagram is down, your Link-in-Bio still works perfectly.

**Q: How often does it sync automatically?**
A: Typically once every 6 hours via GitHub Actions, but you can trigger it manually anytime.

**Q: What if I want to change the look of the site?**
A: The design is managed via standard CSS. Contact the tech team for styling updates.

---
**Technical Support**: Ziaur-786
**Project**: NibsNetwork Blogsite Automation
