import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs"
import path from "path"
import extractContent from "@/utils/extractiveSummarization";
export async function POST(req: Request) {
       // Define directory and file path
       const finalReadme = "finalReadme";
       const finalReadmeDir = path.join(process.cwd(), finalReadme);
       const readmeFilePath = path.join(finalReadmeDir, "README.md");

       // Check if README.md exists
       if (!fs.existsSync(readmeFilePath)) {
           return NextResponse.json({ error: "README.md file not found." }, { status: 400 });
       }

       // Read file content
       let content = fs.readFileSync(readmeFilePath, "utf8");
       content=extractContent(content);

       // Improved prompt structure
       const prompt = `
       You are a senior technical writer creating professional documentation. Generate a polished and flexible README.md for a modern web project (e.g., Next.js, MERN stack, or similar). Follow these guidelines:
       
       ### **README Structure**
       1. **Project Title**  
          - Name with 1 relevant emoji prefix
          - Shields.io badges (version, license, build status, etc.)
          - Concise 1-line description
       
       2. **Features**  
          - 5-7 key capabilities as bullet points
          - Use emoji-led categories (e.g., 🔧 Core Features, 🚀 Deployment, 🔒 Security)
       
       3. **Tech Stack**  
          - Analyze the provided project files (e.g., package.json) to infer the technologies used.
          - Organize the tech stack into a categorized table with official docs links:
            | Category       | Technologies                          |
            |----------------|---------------------------------------|
            | Frontend       | (e.g., React, Next.js)                |
            | Backend        | (e.g., Node.js, Express)              |
            | Database       | (e.g., MongoDB, Mongoose)             |
            | DevOps         | (e.g., Docker, GitHub Actions)        |
          - Include any other relevant libraries or frameworks.
       
       4. **Quick Start**  
          - **Prerequisites**: List required software and versions (e.g., Node.js, MongoDB).
          - **Installation**:
            \`\`\`bash
            git clone [repo-url]
            cd project
            npm install
            \`\`\`
          - **Environment**: List required environment variables:
            \`\`\`env
            PORT=3000
            DB_URI=mongodb://localhost:27017/app
            \`\`\`
       
       5. **Development**  
          - **Commands**: Include common development commands (e.g., start, build, test).
            \`\`\`bash
            npm run dev    # Start development
            npm run build  # Create production build
            npm run test   # Run tests
            \`\`\`
          - **Testing**: Outline the test strategy (unit, integration, E2E).
       
       6. **API Reference** (if applicable)
          - Endpoint table with parameters and examples:
            | Method | Endpoint       | Body                   | Response              |
            |--------|----------------|------------------------|-----------------------|
            | POST   | /api/users     | { name: "John" }       | 201 Created          |
       
       7. **Deployment**  
          - **Dockerfile** (if applicable):
            \`\`\`dockerfile
            FROM node:18-alpine
            WORKDIR /app
            COPY . .
            RUN npm install
            CMD ["npm", "start"]
            \`\`\`
          - Platform guides (e.g., Vercel, Heroku, AWS).
       
       8. **Contributing**  
          - Branch naming convention (e.g., feat/bugfix/chore).
          - Commit message standards.
          - PR template requirements.
       
       ### **Formatting Rules**
       - Use GitHub-flavored markdown.
       - All code in triple backticks with language specification.
       - Tables must align with pipes.
       - Section headers use h2 (##) level.
       - Admonitions formatted as:
         > [!NOTE]
         > Important configuration note.
       
       ### **Style Requirements**
       - Neutral professional tone (no colloquialisms).
       - Consistent spacing between sections.
       - All external links in reference-style:
         [Express][express-url]
       
       ### **Technical Specifications**
       - Analyze the provided project files (e.g., package.json) to infer:
         - Required software versions (e.g., Node.js, MongoDB).
         - Dependencies and devDependencies.
         - Scripts defined in package.json.
         - Environment variables.
         - CI/CD configuration (if detected).
       - Include both npm and yarn commands where applicable.
       
       ### **Project Analysis**
       \`\`\`
       ${content}
       \`\`\`
       
       Generate a publication-ready README with exact technical accuracy. Omit placeholders. Maintain a framework-agnostic structure suitable for any modern web project. Ensure the output is flexible and adapts to the provided project files (e.g., package.json) to infer the tech stack, versions, and dependencies dynamically. The README should professional
       `;
       
       

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        const reply = result.response.text();
        return NextResponse.json({ reply })
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: "An error occurred while generating the response." },
            { status: 500 }
        );
    }
}
