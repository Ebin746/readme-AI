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
       You are an expert technical writer. Your task is to generate a **well-structured, professional README** for a software project. 
       The project files and their corresponding content are provided below. 
       
       ### **Instructions:**
       - **Analyze** the project structure and files.
       - **Understand** the project purpose based on the files and their content.
       - **Write** a high-quality README that follows best practices.
       
       ### **README Structure to Follow:**
       1. **Project Title**  
          - Clearly state the project name.
          - Provide a short, engaging tagline if possible.
       
       2. **Project Description**  
          - Briefly explain what the project does.
          - Mention its key features and technologies used.
       
       3. **Installation Guide**  
          - Provide step-by-step setup instructions.
          - Include commands for dependencies and environment setup.
       
       4. **Usage Instructions**  
          - Explain how users can run and use the project.
          - Provide code examples if necessary.
       
       5. **File Structure Overview**  
          - Summarize the key files and folders.
          - Briefly describe their purpose.
       
       6. **Contribution Guidelines**  
          - Explain how developers can contribute (issues, PRs, coding standards).
       
       7. **License Information** *(if applicable)*  
          - Specify the license type and link to the full license file.
       
       ### **Project Files and Contents:**
       \`\`\`
       ${content}
       \`\`\`
       
       Generate a **concise, professional, and well-formatted** README based on this input.
       output should in structred format
       `;
       

    try {
        const genAI = new GoogleGenerativeAI("AIzaSyB9JFB4drSiwZBmSdQVmbs8erueoPNWhLc");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
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
