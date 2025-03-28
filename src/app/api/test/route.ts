import { NextResponse } from "next/server";
import { excludeExtensions, excludeList } from "@/utils/excludingList";

const GITHUB_API_BASE = "https://api.github.com/repos";

// Function to fetch repo files (recursively fetches all directories)
async function fetchGitHubFiles(owner: string, repo: string, path = "") {
    const url = `${GITHUB_API_BASE}/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, {
        headers: { "User-Agent": "Next.js App" },
    });

    if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);

    const data = await response.json();

    let files: any[] = [];

    // Recursively fetch directories
    for (const item of data) {
        if (item.type === "dir") {
            const subFiles = await fetchGitHubFiles(owner, repo, item.path);
            files = files.concat(subFiles);
        } else {
            files.push(item);
        }
    }

    return files;
}

// Function to fetch file content from GitHub
async function fetchFileContent(downloadUrl: string) {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error(`Error fetching file content`);
    return response.text();
}

export async function POST(req: Request) {
    try {
        const { repoUrl } = await req.json();
        
        // Validate URL
        if (!repoUrl.startsWith("https://github.com/")) {
            return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
        }

        // Extract owner and repo name from URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (!match) {
            return NextResponse.json({ error: "Invalid repository format" }, { status: 400 });
        }
        
        const [_, githubUser, repoName] = match;

        // Recursively fetch all files in the repository
        const filesList = await fetchGitHubFiles(githubUser, repoName);

        let readmeContent = `# ${repoName}\n\n## File List\n\n`;
        
        const codeFiles: Record<string, string> = {}; // Store code files separately

        for (const file of filesList) {
            if (
                file.type === "file" && 
                !excludeList.includes(file.name) && 
                !excludeExtensions.some(ext => file.name.endsWith(ext))
            ) {
                const content = await fetchFileContent(file.download_url);
                
                readmeContent += `- ${file.path}\n`;

                // Store source code separately
                codeFiles[file.path] = content;
            }
        }

        readmeContent += `\n## File Contents\n\n`;
  
        return NextResponse.json({ 
            readmeContent,
            codeFiles // Contains the entire codebase
        });

    } catch (error) {
        return NextResponse.json({ message: "error", error: error.message }, { status: 500 });
    }
}
