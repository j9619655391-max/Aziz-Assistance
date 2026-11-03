import { AIService } from "../infrastructure/AIService";

export class ResumeService {
  constructor(private aiService: AIService) {}

  /**
   * Parse uploaded resume file (PDF, Docx, TXT) and extract its text
   */
  public async parseResume(
    fileData: string,
    mimeType: string,
    fileName?: string
  ): Promise<string> {
    const isPlain = mimeType.startsWith("text/") || 
                    mimeType === "application/json" || 
                    fileName?.endsWith(".md") || 
                    fileName?.endsWith(".txt");

    if (isPlain) {
      try {
        return Buffer.from(fileData, "base64").toString("utf-8");
      } catch (err: any) {
        throw new Error("Failed to decode text file: " + err.message);
      }
    }

    if (mimeType === "application/pdf" || 
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword") {
      
      const client = this.aiService.getClient();
      if (!client) {
        throw new Error("AI parser is offline. Please configure GEMINI_API_KEY in Settings > Secrets to parse PDFs or Word documents automatically, or copy-paste your resume text instead.");
      }

      const response = await this.aiService.generateContentWithFallback({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileData
            }
          },
          "Extract the full textual content of this candidate resume document into clean, professional, well-formatted plain text. Include all major sections such as Summary, Technical Skills, Professional Experience, Education, and Projects. Ensure all wording, dates, titles, and details are preserved exactly. Do NOT add any introductions, conversational explanations, or markdown wrappers like ```text - output ONLY the extracted plain text resume content."
        ],
        config: {
          temperature: 0.0
        }
      });

      if (response && response.text) {
        return response.text.trim();
      } else {
        throw new Error("No text content could be extracted from the uploaded document.");
      }
    }

    throw new Error(`Unsupported file type: ${mimeType}. Please upload a .txt, .md, .pdf, or .docx file, or use the copy-paste option.`);
  }
}
