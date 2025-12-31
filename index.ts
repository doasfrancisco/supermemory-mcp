import { McpServer } from "@metorial/mcp-server-sdk";
import { z } from "zod";
import { Supermemory } from "supermemory";

const server = new McpServer({
    name: "Supermemory MCP",
    version: "1.0.0",
});

// Get API key and user ID from environment
const apiKey = process.env.SUPERMEMORY_API_KEY;
const userId = process.env.SUPERMEMORY_USER_ID || "default-user";

if (!apiKey) {
    console.error("SUPERMEMORY_API_KEY environment variable is required");
    process.exit(1);
}

const supermemory = new Supermemory({
    apiKey,
});

// Add memory tool
server.tool(
    "addMemory",
    "Store user information, preferences, and behaviors. Run on explicit commands ('remember this') or implicitly when detecting significant user traits, preferences, or patterns. Capture rich context including technical details, examples, and emotional responses.",
    {
        thingToRemember: z.string().describe("The information to remember"),
        projectId: z.string().optional().describe("Optional project ID to associate with the memory"),
    },
    async ({ thingToRemember, projectId }) => {
        const containerTags = projectId ? [userId, projectId] : [userId];

        const { memories } = await supermemory.memories.list({
            containerTags: [userId],
        });

        if (memories.length > 2000) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: "Memory limit of 2000 memories exceeded",
                    },
                ],
                isError: true,
            };
        }

        await supermemory.memories.add({
            content: thingToRemember,
            containerTags,
        });

        return {
            content: [
                {
                    type: "text" as const,
                    text: "Memory added successfully",
                },
            ],
        };
    }
);

// Search memory tool
server.tool(
    "search",
    "Search user memories and patterns. Run when explicitly asked or when context about user's past choices would be helpful. Uses semantic matching to find relevant details across related experiences.",
    {
        informationToGet: z.string().describe("The information to search for"),
        projectId: z.string().optional().describe("Optional project ID to filter search results"),
    },
    async ({ informationToGet, projectId }) => {
        const containerTags = projectId ? [userId, projectId] : [userId];

        const response = await supermemory.search.execute({
            q: informationToGet,
            containerTags,
        });

        const resultText = response.results
            .map((r) => r.chunks.map((c) => c.content).join("\n\n"))
            .join("\n\n---\n\n");

        return {
            content: [
                {
                    type: "text" as const,
                    text: resultText || "No memories found matching your query.",
                },
            ],
        };
    }
);

// Get projects tool
server.tool(
    "getProjects",
    "List user projects. Use the returned containerTag (e.g., sm_project_alpha) as the projectId in other tools. Bare IDs are accepted and normalized to sm_project_{id}.",
    {},
    async () => {
        // Note: This is a simplified implementation. You may need to adjust based on your supermemory setup
        return {
            content: [
                {
                    type: "text" as const,
                    text: "Projects feature requires additional configuration. Please use the default user context.",
                },
            ],
        };
    }
);

// Who am I tool
server.tool(
    "whoAmI",
    "Get the current logged-in user's information",
    {},
    async () => {
        return {
            content: [
                {
                    type: "text" as const,
                    text: `Current user ID: ${userId}`,
                },
            ],
        };
    }
);

// Supermemory prompt
server.prompt(
    "supermemory-prompt",
    "A prompt that gives information about supermemory and how to use it effectively.",
    {},
    async () => {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: "IMPORTANT: You MUST use Supermemory tools proactively to be an effective assistant. Here's how:\n\n1. ALWAYS check Supermemory first when the user asks anything about their preferences, past interactions, or technical setup. Don't assume you know everything - search first!\n\n2. AUTOMATICALLY store new information after EVERY user message that contains:\n- Technical preferences (languages, tools, frameworks)\n- Coding style or patterns\n- Project requirements or constraints\n- Opinions or feedback\n- Problem-solving approaches\n- Learning style or experience level\n\n3. Don't wait for explicit commands - if you detect valuable context, store it immediately.\n\n4. Think of yourself as building a comprehensive user profile. Every interaction is an opportunity to learn and store more context.\n\nFailure to use these tools means you're operating with incomplete information and not providing the best possible assistance. Make Supermemory your first instinct, not your last resort.",
                    },
                },
            ],
        };
    }
);

server.run();
