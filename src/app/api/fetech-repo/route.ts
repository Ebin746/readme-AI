import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Exclude lists
const excludeList = [
    "node_modules", ".npm", ".yarn", ".pnp", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "dist", "build", "out", ".next", ".vercel", ".turbo", "coverage", ".expo", ".expo-shared",
    "cypress/screenshots", "cypress/videos",
    "vite.config.js", "vite.config.ts", "next.config.js", "next.config.mjs", "webpack.config.js",
    "babel.config.js", ".babelrc", "tsconfig.json", "jsconfig.json", ".eslintrc.js", ".eslintignore",
    ".prettierrc", ".prettierignore", ".editorconfig", ".stylelintrc", ".lintstagedrc",
    ".env", ".env.local", ".env.development", ".env.production", ".env.test",
    "npm-debug.log", "yarn-error.log", "pnpm-debug.log", ".DS_Store", "Thumbs.db", "debug.log",
    "public", "assets", "static", "favicon.ico", "logo192.png", "logo512.png",
    ".github", ".gitlab", ".circleci", ".husky", "jest.config.js", "jest.setup.js",
    ".vscode", ".idea", ".project", ".settings", ".classpath", ".factorypath",
    ".git", ".gitignore"
];

const excludeExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".ttf", ".woff", ".woff2", ".otf", ".eot",
    ".mp4", ".mp3", ".wav", ".mov", ".avi",
    ".zip", ".rar", ".tar.gz"
];

const getFiles = (dir: string, baseDir: string, files: { name: string; content: string }[] = []): { name: string; content: string }[] => {
    fs.readdirSync(dir).forEach((file) => {
        const fullPath = path.join(dir, file);
        if (excludeList.includes(file) || excludeExtensions.includes(path.extname(file))) return;

        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, baseDir, files);
        } else {
            try {
                const relativePath = path.relative(baseDir, fullPath); // Get relative path from 'project/'
                const content = fs.readFileSync(fullPath, "utf8"); // Read file contents
                files.push({ name: relativePath, content });
            } catch (err) {
                console.error(`Error reading file ${fullPath}: ${err}`);
            }
        }
    });
    return files;
};

export async function POST(req: Request) {
    try {
        const { repoUrl } = await req.json();
        if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
            return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
        }
        
        const repoName = "project";
        const finalReadme = "finalReadme";
        
        const projectDir = path.join(process.cwd(), repoName);
        const finalReadmeDir = path.join(process.cwd(), finalReadme);

        // Remove existing directories and contents
        if (fs.existsSync(projectDir)) fs.rmSync(projectDir, { recursive: true, force: true });
        if (fs.existsSync(finalReadmeDir)) fs.rmSync(finalReadmeDir, { recursive: true, force: true });

        // Clone repo (No authentication)
        execSync(`git clone ${repoUrl} ${projectDir}`, { stdio: "inherit" });

        // Process files
        const filesList = getFiles(projectDir, projectDir);

        let readmeContent = `# ${repoName}\n\n## File List\n\n`;
        
        // Add file names only
        filesList.forEach(({ name }) => {
            readmeContent += `- ${name}\n`;
        });

        readmeContent += `\n## File Contents\n\n`;

        // Add file content
        filesList.forEach(({ name, content }) => {
            readmeContent += `### ${name}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        });

        // Ensure the finalReadme directory exists
        fs.mkdirSync(finalReadmeDir, { recursive: true });

        // Write README to finalReadme directory
        fs.writeFileSync(path.join(finalReadmeDir, "README.md"), readmeContent, "utf8");

        return NextResponse.json({ success: true, message: "README generated!", repo: repoName });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
