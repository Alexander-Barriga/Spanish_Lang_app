import { supabaseAdmin } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

const AUDIO_BUCKET = 'audio-recordings';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class StorageService {
  /**
   * Initialize the storage bucket (call this once on server start)
   */
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === AUDIO_BUCKET);

      if (!bucketExists) {
        // Create the bucket
        const { error } = await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
          public: false, // Private bucket - requires auth to access
          fileSizeLimit: 25 * 1024 * 1024, // 25MB limit
          allowedMimeTypes: [
            'audio/webm',
            'audio/wav',
            'audio/mpeg',
            'audio/mp3',
            'audio/mp4',
            'audio/m4a',
            'audio/ogg',
            'audio/x-m4a',
            'audio/x-caf',
          ],
        });

        if (error) {
          console.error('Failed to create audio bucket:', error);
        } else {
          console.log('✅ Audio storage bucket created');
        }
      } else {
        console.log('✅ Audio storage bucket already exists');
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
    }
  }

  /**
   * Upload audio file to Supabase Storage
   */
  async uploadAudio(
    audioBuffer: Buffer,
    userId: string,
    conversationId: string,
    mimeType: string = 'audio/webm'
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const extension = this.getExtensionFromMime(mimeType);
      const filename = `${userId}/${conversationId}/${uuidv4()}.${extension}`;

      console.log(`📤 Uploading audio: ${filename} (${audioBuffer.length} bytes)`);

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .upload(filename, audioBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL (or signed URL for private bucket)
      const { data: urlData } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(filename, 60 * 60 * 24 * 365); // 1 year expiry

      if (!urlData?.signedUrl) {
        return { success: false, error: 'Failed to generate URL' };
      }

      console.log(`✅ Audio uploaded: ${filename}`);
      return { success: true, url: urlData.signedUrl };
    } catch (error) {
      console.error('Storage upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Get audio file URL
   */
  async getAudioUrl(path: string): Promise<string | null> {
    try {
      const { data } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(path, 60 * 60); // 1 hour expiry

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Get URL error:', error);
      return null;
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudio(path: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .remove([path]);

      return !error;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  /**
   * Delete all audio for a conversation
   */
  async deleteConversationAudio(userId: string, conversationId: string): Promise<boolean> {
    try {
      const folderPath = `${userId}/${conversationId}`;
      
      // List all files in the conversation folder
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .list(folderPath);

      if (listError || !files || files.length === 0) {
        return true; // No files to delete
      }

      // Delete all files
      const filePaths = files.map(f => `${folderPath}/${f.name}`);
      const { error } = await supabaseAdmin.storage
        .from(AUDIO_BUCKET)
        .remove(filePaths);

      return !error;
    } catch (error) {
      console.error('Delete conversation audio error:', error);
      return false;
    }
  }

  private getExtensionFromMime(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/x-caf': 'caf',
    };
    return mimeToExt[mimeType] || 'audio';
  }
}

// Export singleton instance
export const storageService = new StorageService();

