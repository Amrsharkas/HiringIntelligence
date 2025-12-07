import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const access = promisify(fs.access);

/**
 * FileStorageService handles saving uploaded files to local disk
 */
export class FileStorageService {
  private baseDirectory: string;

  constructor() {
    // Use project root /var/www/plato/HiringIntelligence/uploads
    this.baseDirectory = path.join(process.cwd(), 'uploads', 'resumes');

    // Ensure directory exists
    this.ensureDirectoryExists().catch(err => {
      console.error('Failed to create uploads directory:', err);
    });
  }

  /**
   * Ensure the base directory and subdirectories exist
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await access(this.baseDirectory, fs.constants.F_OK);
    } catch {
      await mkdir(this.baseDirectory, { recursive: true });
      console.log(`✅ Created resume uploads directory: ${this.baseDirectory}`);
    }
  }

  /**
   * Get file extension from filename or mime type
   */
  private getFileExtension(fileName: string, fileType?: string): string {
    // First try to get extension from filename
    const nameExt = path.extname(fileName).toLowerCase();
    if (nameExt) {
      return nameExt;
    }

    // Fallback to mime type
    if (fileType) {
      const mimeMap: { [key: string]: string } = {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/msword': '.doc',
        'text/plain': '.txt',
        'text/rtf': '.rtf',
        'application/rtf': '.rtf'
      };

      return mimeMap[fileType] || '.bin';
    }

    return '.bin';
  }

  /**
   * Generate a safe filename
   */
  private generateSafeFileName(originalFileName: string, userId: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const baseName = path.basename(originalFileName).replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}_${randomStr}_${baseName}`;
  }

  /**
   * Save a file from base64 content
   */
  async saveFileFromBase64(
    fileContent: string,
    fileName: string,
    fileType: string,
    userId: string
  ): Promise<{ filePath: string; fileName: string; relativePath: string }> {
    await this.ensureDirectoryExists();

    // Generate safe filename
    const safeFileName = this.generateSafeFileName(fileName, userId);
    const fileExtension = this.getFileExtension(safeFileName, fileType);

    // Ensure the file has the correct extension
    const finalFileName = safeFileName.endsWith(fileExtension)
      ? safeFileName
      : `${safeFileName}${fileExtension}`;

    // Create organization-specific subdirectory
    const orgDir = path.join(this.baseDirectory, userId);
    try {
      await access(orgDir, fs.constants.F_OK);
    } catch {
      await mkdir(orgDir, { recursive: true });
    }

    // Full file path
    const filePath = path.join(orgDir, finalFileName);

    try {
      // Decode base64 and save file
      const buffer = Buffer.from(fileContent, 'base64');
      await writeFileAsync(filePath, buffer);

      console.log(`💾 Saved file locally: ${filePath} (${buffer.length} bytes)`);

      // Return relative path for storage in database
      const relativePath = path.relative(process.cwd(), filePath);

      return {
        filePath,
        fileName: finalFileName,
        relativePath
      };
    } catch (error) {
      console.error('❌ Error saving file:', error);
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a file from buffer
   */
  async saveFileFromBuffer(
    buffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<{ filePath: string; fileName: string; relativePath: string }> {
    await this.ensureDirectoryExists();

    // Generate safe filename
    const safeFileName = this.generateSafeFileName(fileName, userId);
    const fileExtension = path.extname(fileName) || '.bin';

    // Create organization-specific subdirectory
    const orgDir = path.join(this.baseDirectory, userId);
    try {
      await access(orgDir, fs.constants.F_OK);
    } catch {
      await mkdir(orgDir, { recursive: true });
    }

    // Full file path
    const finalFileName = safeFileName.endsWith(fileExtension)
      ? safeFileName
      : `${safeFileName}${fileExtension}`;
    const filePath = path.join(orgDir, finalFileName);

    try {
      await writeFileAsync(filePath, buffer);

      console.log(`💾 Saved file from buffer: ${filePath} (${buffer.length} bytes)`);

      // Return relative path for storage in database
      const relativePath = path.relative(process.cwd(), filePath);

      return {
        filePath,
        fileName: finalFileName,
        relativePath
      };
    } catch (error) {
      console.error('❌ Error saving file from buffer:', error);
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the base directory for uploads
   */
  getBaseDirectory(): string {
    return this.baseDirectory;
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a file and return its content as base64
   */
  async readFileAsBase64(filePath: string): Promise<string> {
    try {
      const buffer = await readFileAsync(filePath);
      return buffer.toString('base64');
    } catch (error) {
      console.error(`❌ Error reading file: ${filePath}`, error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read a file and return its content as buffer
   */
  async readFileAsBuffer(filePath: string): Promise<Buffer> {
    try {
      return await readFileAsync(filePath);
    } catch (error) {
      console.error(`❌ Error reading file: ${filePath}`, error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
