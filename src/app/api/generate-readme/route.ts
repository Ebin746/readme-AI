import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs"
import path from "path"
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
       const content = fs.readFileSync(readmeFilePath, "utf8");

       // Improved prompt structure
       const prompt = `
       You are an expert technical writer specializing in open-source documentation. Generate a professional, comprehensive README.md file following industry best practices. Use this structure and guidelines:
       
       ### **README Structure**
       1. **Project Title**  
          - Clear name with optional emoji decoration
          - Badges for version, license, build status, etc.
          - Brief engaging tagline
       
       2. **Table of Contents** (with anchor links)
       
       3. **Project Overview**
          - **Description**: Clear explanation of purpose and value proposition
          - **Features**: Bullet list of key features with emoji icons
          - **Tech Stack**: Table of technologies with categories (Frontend, Backend, etc.)
       
       4. **Getting Started**
          - **Prerequisites**: List required software/accounts
          - **Installation**: 
            - Step-by-step commands with code blocks
            - Environment variables setup guide
            - Configuration instructions
          
       5. **Development Guide**
          - Local setup instructions
          - Building from source
          - Testing procedures
          - Deployment workflow
       
       
       6. **Contributing**
          - Contribution workflow
          - Code style guidelines
          - Issue/bug reporting process
          - PR submission standards
       
       7. **License**
          - Clear license statement with link to LICENSE file
          - Copyright notice
       
       8. **Acknowledgments**
          - Third-party assets
          - Inspiration sources
          - Contributor recognition
       
       ### **Style Guidelines**
       - Use proper Markdown formatting
       - Include relevant emoji decorators (🎯 for objectives, 🛠️ for tools, etc.)

       - Use tables for technical specifications
       - Include code blocks with syntax highlighting
       - Add warning/admonition blocks for important notes
       - Maintain professional yet approachable tone
       
       ### **Technical Requirements**
       - Generate badge URLs using shields.io
       - Create environment variable examples in .env format
       - Include common development commands (npm run dev/build/test)
       - Mention CI/CD pipeline integration points
       
       ### **Project Files Analysis**
       \`\`\`
       ${content}
       \`\`\`
       
       Generate a production-ready README that follows these specifications exactly. Prioritize clarity, completeness, and professional presentation.
       `;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        console.log("rep",result.response.text())
        const reply = result.response.text();
        return NextResponse.json({ reply: `\`\`\`markdown\n${reply}\n\`\`\`` })
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: "An error occurred while generating the response." },
            { status: 500 }
        );
    }
}
