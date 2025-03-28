import extractContent from "@/utils/extractiveSummarization";
import { existsSync, readFileSync } from "fs";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  try {
    // Define directory and file path
    const finalReadme = "finalReadme";
    const finalReadmeDir = path.join(process.cwd(), finalReadme);
    const readmeFilePath = path.join(finalReadmeDir, "README.md");

    // Check if the file exists
    if (!existsSync(readmeFilePath)) {
      return NextResponse.json(
        { message: "README.md file not found" },
        { status: 404 }
      );
    }

    // Read file content
    const content = readFileSync(readmeFilePath, "utf8");
    console.log(content.toString().length);

    // Extract content
    const result = extractContent(content);
    console.log("res",result.length)

    // Return the result
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Failed to process the request" },
      { status: 500 }
    );
  }
}