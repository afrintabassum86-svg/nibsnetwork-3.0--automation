import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from "playwright";

const server = new Server(
    {
        name: "instagram-scraper",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_instagram_posts",
                description: "Fetch recent posts from an Instagram profile",
                inputSchema: {
                    type: "object",
                    properties: {
                        username: {
                            type: "string",
                            description: "The Instagram username to fetch posts from",
                        },
                    },
                    required: ["username"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "get_instagram_posts") {
        throw new Error("Tool not found");
    }

    const username = request.params.arguments?.username;
    if (!username) {
        throw new Error("Username is required");
    }

    // Launch playwright
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`https://www.picuki.com/profile/${username}`, { waitUntil: 'networkidle' });

        const posts = await page.evaluate(() => {
            const items = document.querySelectorAll('.post-box');
            return Array.from(items).slice(0, 12).map(item => {
                const link = item.querySelector('.media-link')?.getAttribute('href');
                const img = item.querySelector('.post-image')?.getAttribute('src');
                const caption = item.querySelector('.photo-description')?.textContent?.trim() || "";
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    imageUrl: img,
                    caption: caption,
                    sourceUrl: link
                };
            });
        });

        await browser.close();
        return {
            content: [{ type: "text", text: JSON.stringify(posts, null, 2) }]
        };
    } catch (error) {
        if (browser) await browser.close();
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
