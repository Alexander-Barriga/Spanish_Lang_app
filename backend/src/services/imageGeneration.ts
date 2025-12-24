/**
 * Image Generation Service
 * 
 * Generates images using DALL-E 3 and stores them in Supabase Storage.
 * Used for episode scene images and article illustrations.
 */

import { openai } from '../config/openai';
import { supabaseAdmin } from '../config/supabase';

const NARRATIVE_IMAGES_BUCKET = 'narrative-images';

// ============================================
// Types
// ============================================

export interface SceneImageConfig {
  episodeNumber: number;
  sceneId: string;
  sceneDescription: string;
  location: string;
  emotionalBeat: string;
  culturalContext?: string;
}

export interface ArticleImageConfig {
  episodeId: string;
  articleId: string;
  imageType: 'header' | 'inline';
  position: number;  // 0 for header, 1+ for inline images
  imageDescription: string;
  altText?: string;
}

export interface StoredImage {
  url: string;           // Public Supabase URL
  storagePath: string;   // Path in bucket for management
  prompt: string;        // The prompt used (for reference/regeneration)
}

export interface GenerationResult {
  success: boolean;
  image?: StoredImage;
  error?: string;
}

// ============================================
// Style Guide Constants
// ============================================

const STYLE_PREFIX = `Warm, nostalgic photography style with subtle film grain. 
Buenos Aires aesthetic: golden hour lighting, terracotta and deep blue tones.
Eye-level perspective, intimate framing.
Inviting, lived-in, authentic atmosphere.
DO NOT include any text, signs with text, or written words in the image.
NO stock photo feel, NO empty spaces, NO overly polished look.`;

const EMOTIONAL_BEAT_MODIFIERS: Record<string, string> = {
  curiosity: 'sense of discovery and wonder, open body language',
  vulnerability: 'intimate and tender, soft lighting, emotional depth',
  connection: 'warmth between people, genuine interaction, engaged expressions',
  nostalgia: 'wistful atmosphere, vintage elements, golden memories',
  resilience: 'quiet strength, determination, hope amid challenge',
  hope: 'uplifting light, optimistic composition, forward-looking',
  playfulness: 'light-hearted energy, subtle humor, joyful moments',
  trust: 'open and relaxed, comfortable proximity, mutual respect',
};

// ============================================
// Image Generation Service Class
// ============================================

export class ImageGenerationService {
  /**
   * Initialize the narrative images bucket
   */
  async initializeBucket(): Promise<void> {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === NARRATIVE_IMAGES_BUCKET);

      if (!bucketExists) {
        const { error } = await supabaseAdmin.storage.createBucket(NARRATIVE_IMAGES_BUCKET, {
          public: true,  // Public bucket for easy image access
          fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        });

        if (error) {
          console.error('Failed to create narrative images bucket:', error);
        } else {
          console.log('✅ Narrative images storage bucket created');
        }
      } else {
        console.log('✅ Narrative images storage bucket already exists');
      }
    } catch (error) {
      console.error('Image storage initialization error:', error);
    }
  }

  /**
   * Build a prompt for DALL-E 3 based on scene configuration
   */
  private buildScenePrompt(config: SceneImageConfig): string {
    const emotionalModifier = EMOTIONAL_BEAT_MODIFIERS[config.emotionalBeat] || '';
    
    return `${STYLE_PREFIX}

Scene: ${config.sceneDescription}
Location: ${config.location}, Buenos Aires, Argentina
${config.culturalContext ? `Cultural context: ${config.culturalContext}` : ''}
Emotional tone: ${config.emotionalBeat}${emotionalModifier ? ` - ${emotionalModifier}` : ''}

Create a cinematic, atmospheric image that captures the essence of this Buenos Aires scene.
The image should feel like a still from an indie film about life in Argentina.`;
  }

  /**
   * Build a prompt for article images
   */
  private buildArticlePrompt(description: string): string {
    return `${STYLE_PREFIX}

${description}

Create an evocative image that complements a written article about Buenos Aires and Spanish language learning.
The image should inspire and immerse the reader in Argentine culture.`;
  }

  /**
   * Generate an image with DALL-E 3
   */
  private async generateWithDallE(prompt: string): Promise<string> {
    console.log('🎨 Generating image with DALL-E 3...');
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1792x1024',  // Wide format for scene headers
      quality: 'hd',
      style: 'natural',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    console.log('✅ Image generated successfully');
    return imageUrl;
  }

  /**
   * Download image from URL and convert to buffer
   */
  private async downloadImage(url: string): Promise<Buffer> {
    console.log('📥 Downloading generated image...');
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Upload image buffer to Supabase Storage
   */
  private async uploadToStorage(
    buffer: Buffer, 
    storagePath: string
  ): Promise<string> {
    console.log(`📤 Uploading to storage: ${storagePath}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(NARRATIVE_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',  // DALL-E returns PNG by default
        upsert: true,  // Allow overwriting for regeneration
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(NARRATIVE_IMAGES_BUCKET)
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('✅ Image uploaded to storage');
    return urlData.publicUrl;
  }

  /**
   * Generate and store a scene image
   */
  async generateSceneImage(config: SceneImageConfig): Promise<GenerationResult> {
    try {
      const prompt = this.buildScenePrompt(config);
      const storagePath = `episodes/${config.episodeNumber}/scenes/${config.sceneId}.png`;

      // Generate with DALL-E
      const tempUrl = await this.generateWithDallE(prompt);

      // Download the image
      const imageBuffer = await this.downloadImage(tempUrl);

      // Upload to Supabase
      const publicUrl = await this.uploadToStorage(imageBuffer, storagePath);

      return {
        success: true,
        image: {
          url: publicUrl,
          storagePath,
          prompt,
        },
      };
    } catch (error) {
      console.error('Scene image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate and store an article image
   */
  async generateArticleImage(config: ArticleImageConfig): Promise<GenerationResult> {
    try {
      const prompt = this.buildArticlePrompt(config.imageDescription);
      const storagePath = `articles/${config.episodeId}/${config.imageType}-${config.position}.png`;

      // Generate with DALL-E
      const tempUrl = await this.generateWithDallE(prompt);

      // Download the image
      const imageBuffer = await this.downloadImage(tempUrl);

      // Upload to Supabase
      const publicUrl = await this.uploadToStorage(imageBuffer, storagePath);

      // Store reference in article_images table
      const { error: dbError } = await supabaseAdmin
        .from('article_images')
        .upsert({
          article_id: config.articleId,
          image_type: config.imageType,
          position: config.position,
          image_url: publicUrl,
          storage_path: storagePath,
          image_prompt: prompt,
          alt_text: config.altText || config.imageDescription,
        }, {
          onConflict: 'article_id,image_type,position',
        });

      if (dbError) {
        console.warn('Warning: Could not save image reference to database:', dbError);
        // Continue anyway - image is still uploaded
      }

      return {
        success: true,
        image: {
          url: publicUrl,
          storagePath,
          prompt,
        },
      };
    } catch (error) {
      console.error('Article image generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate all images for an episode's scenes
   */
  async generateEpisodeImages(
    episodeNumber: number,
    scenes: Array<{
      sceneId: string;
      description: string;
      location: string;
      emotionalBeat: string;
      culturalContext?: string;
    }>
  ): Promise<Map<string, GenerationResult>> {
    const results = new Map<string, GenerationResult>();

    console.log(`\n🎬 Generating images for Episode ${episodeNumber} (${scenes.length} scenes)...`);

    for (const scene of scenes) {
      console.log(`\n  Scene: ${scene.sceneId}`);
      
      const result = await this.generateSceneImage({
        episodeNumber,
        sceneId: scene.sceneId,
        sceneDescription: scene.description,
        location: scene.location,
        emotionalBeat: scene.emotionalBeat,
        culturalContext: scene.culturalContext,
      });

      results.set(scene.sceneId, result);

      // Add delay between generations to avoid rate limits
      if (scenes.indexOf(scene) < scenes.length - 1) {
        await this.delay(2000); // 2 second delay
      }
    }

    const successCount = Array.from(results.values()).filter(r => r.success).length;
    console.log(`\n✅ Episode ${episodeNumber}: ${successCount}/${scenes.length} images generated`);

    return results;
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(storagePath: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(NARRATIVE_IMAGES_BUCKET)
        .remove([storagePath]);

      return !error;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  }

  /**
   * Delete all images for an episode
   */
  async deleteEpisodeImages(episodeNumber: number): Promise<boolean> {
    try {
      const folderPath = `episodes/${episodeNumber}`;
      
      // List all files in the episode folder
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(NARRATIVE_IMAGES_BUCKET)
        .list(`${folderPath}/scenes`);

      if (listError || !files || files.length === 0) {
        return true; // No files to delete
      }

      // Delete all files
      const filePaths = files.map(f => `${folderPath}/scenes/${f.name}`);
      const { error } = await supabaseAdmin.storage
        .from(NARRATIVE_IMAGES_BUCKET)
        .remove(filePaths);

      return !error;
    } catch (error) {
      console.error('Delete episode images error:', error);
      return false;
    }
  }

  /**
   * Get the public URL for an existing image
   */
  getPublicUrl(storagePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(NARRATIVE_IMAGES_BUCKET)
      .getPublicUrl(storagePath);
    
    return data.publicUrl;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const imageGenerationService = new ImageGenerationService();

// Export bucket name for use in other services
export { NARRATIVE_IMAGES_BUCKET };

