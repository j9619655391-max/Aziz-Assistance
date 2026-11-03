import { IAppRepository } from "../shared/repository/IRepository";
import { AIService } from "../infrastructure/AIService";
import crypto from "crypto";

export interface DocumentChunk {
  id: string;
  documentId: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  checksum: string;
  embedding?: number[];
  timestamp: string;
}

export class DocumentIngestionService {
  constructor(
    private repo: IAppRepository,
    private aiService: AIService
  ) {}

  /**
   * Main pipeline to Ingest a document (PDF, DOCX, TXT)
   */
  public async ingestDocument(
    fileName: string,
    mimeType: string,
    fileDataBase64: string
  ): Promise<{ success: boolean; documentId: string; chunksCount: number; isDuplicate: boolean }> {
    // 1. Calculate Content Checksum for duplicate detection
    const checksum = crypto.createHash("sha256").update(fileDataBase64).digest("hex");
    const documentId = crypto.createHash("md5").update(fileName).digest("hex");

    // Check duplicate document
    const existing = await this.repo.findById<any>("ingested_documents_meta", documentId);
    if (existing && existing.checksum === checksum) {
      console.log(`[DocumentIngestionService] Document [${fileName}] already ingested and unchanged. Skipping indexing.`);
      return { success: true, documentId, chunksCount: existing.chunksCount, isDuplicate: true };
    }

    // 2. Extract Text from document
    let rawText = "";
    if (mimeType.includes("text/plain") || fileName.endsWith(".txt")) {
      rawText = Buffer.from(fileDataBase64, "base64").toString("utf-8");
    } else {
      // For binary documents like PDF/DOCX, delegate extraction to Gemini Multimodal!
      // This is a production-grade technique that leverages LLM's visual & structure parser.
      console.log(`[DocumentIngestionService] Using Gemini Multimodal pipeline to parse: ${fileName}`);
      try {
        const response = await this.aiService.generateContentWithFallback({
          model: "gemini-3.5-flash",
          contents: [
            {
              inlineData: {
                data: fileDataBase64,
                mimeType: mimeType
              }
            },
            "Please extract and output all raw textual contents and visual structural data from this document verbatim. Do not summarize, format cleanly."
          ]
        });
        rawText = response.text || "";
      } catch (err: any) {
        console.warn(`[DocumentIngestionService] Gemini multimodal parse failed, falling back to base64 buffer preview: ${err.message}`);
        rawText = Buffer.from(fileDataBase64, "base64").toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, "");
      }
    }

    if (!rawText.trim()) {
      throw new Error(`Failed to extract any readable text from document: ${fileName}`);
    }

    // 3. Chunk text (500-char segments with 100-char overlap)
    const chunks = this.chunkText(rawText, 500, 100);
    console.log(`[DocumentIngestionService] Extracted text from [${fileName}] and created [${chunks.length}] chunks.`);

    // 4. Delete existing chunks if re-indexing
    if (existing) {
      await this.deleteDocumentChunks(documentId);
    }

    // 5. Generate embeddings & save chunks
    const aiClient = this.aiService.getClient();
    const storedChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embedding: number[] = [];

      if (aiClient) {
        try {
          const embedRes = await aiClient.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: chunkText
          });
          // Extract numerical vector
          const values = (embedRes as any).embedding?.values || (embedRes as any).embeddings?.[0]?.values;
          if (Array.isArray(values)) {
            embedding = values;
          }
        } catch (embedErr: any) {
          console.warn(`[DocumentIngestionService] Embedding failed for chunk ${i}: ${embedErr.message}`);
        }
      }

      const chunkId = `${documentId}-chunk-${i}`;
      const chunkData: DocumentChunk = {
        id: chunkId,
        documentId,
        fileName,
        chunkIndex: i,
        content: chunkText,
        checksum,
        embedding,
        timestamp: new Date().toISOString()
      };

      await this.repo.insert("ingested_document_chunks", chunkData);
      storedChunks.push(chunkData);
    }

    // Save document metadata
    await this.repo.insert("ingested_documents_meta", {
      id: documentId,
      fileName,
      mimeType,
      checksum,
      chunksCount: chunks.length,
      timestamp: new Date().toISOString()
    });

    await this.repo.addSystemLog(
      "success",
      "database",
      `Knowledge Ingestion Pipeline completed: [${fileName}] parsed into [${chunks.length}] embedding chunks successfully.`
    );

    return {
      success: true,
      documentId,
      chunksCount: chunks.length,
      isDuplicate: false
    };
  }

  /**
   * Search ingested documents using cosine similarity or keyword search
   */
  public async searchIngested(query: string, limit = 5): Promise<Array<{ fileName: string; content: string; score: number }>> {
    const aiClient = this.aiService.getClient();
    let queryEmbedding: number[] | null = null;

    if (aiClient) {
      try {
        const embedRes = await aiClient.models.embedContent({
          model: "gemini-embedding-2-preview",
          contents: query
        });
        const values = (embedRes as any).embedding?.values || (embedRes as any).embeddings?.[0]?.values;
        if (Array.isArray(values)) {
          queryEmbedding = values;
        }
      } catch (err: any) {
        console.warn(`[DocumentIngestionService] Failed to embed search query: ${err.message}`);
      }
    }

    const allChunks = await this.repo.findAll<DocumentChunk>("ingested_document_chunks");
    const results: Array<{ fileName: string; content: string; score: number }> = [];

    for (const chunk of allChunks) {
      let score = 0;
      if (queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
        score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      } else {
        // Fallback to text matching
        const q = query.toLowerCase();
        const content = chunk.content.toLowerCase();
        if (content.includes(q)) score = 0.5;
      }

      if (score > 0) {
        results.push({
          fileName: chunk.fileName,
          content: chunk.content,
          score
        });
      }
    }

    // Sort descending by score
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Delete Document chunks and sync database
   */
  public async deleteDocument(documentId: string): Promise<boolean> {
    await this.deleteDocumentChunks(documentId);
    await this.repo.delete("ingested_documents_meta", documentId);
    return true;
  }

  private async deleteDocumentChunks(documentId: string): Promise<void> {
    const allChunks = await this.repo.findAll<DocumentChunk>("ingested_document_chunks");
    const docChunks = allChunks.filter(c => c.documentId === documentId);
    for (const chunk of docChunks) {
      await this.repo.delete("ingested_document_chunks", chunk.id);
    }
  }

  /**
   * Helper text splitter
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let index = 0;
    while (index < text.length) {
      const chunk = text.substring(index, index + chunkSize);
      chunks.push(chunk);
      index += chunkSize - overlap;
    }
    return chunks;
  }

  /**
   * Helper cosine similarity computation
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
