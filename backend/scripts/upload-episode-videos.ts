/**
 * Upload Episode Videos Script
 * 
 * This script uploads episode video files to Supabase storage bucket
 * and updates the episodes table with video URLs.
 * 
 * Usage: npx ts-node scripts/upload-episode-videos.ts
 * 
 * Note: Videos should be in the App_Final_Videos folder with format Episode_X.mp4
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const BUCKET_NAME = 'episode-videos';
const VIDEOS_FOLDER = path.join(__dirname, '../../App_Final_Videos');

interface Episode {
  id: string;
  episode_number: number;
  title_es: string;
  video_url: string | null;
}

/**
 * Ensure the episode-videos bucket exists
 */
async function ensureBucketExists(): Promise<boolean> {
  console.log('📦 Checking if episode-videos bucket exists...');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error listing buckets:', error.message);
    return false;
  }
  
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  
  if (!bucketExists) {
    console.log('📦 Creating episode-videos bucket...');
    // Use default file size limit to avoid tier restrictions
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm']
    });
    
    if (createError) {
      console.error('❌ Error creating bucket:', createError.message);
      console.log('💡 Try creating the bucket manually in Supabase Dashboard:');
      console.log('   1. Go to Storage in your Supabase project');
      console.log('   2. Create a new bucket named "episode-videos"');
      console.log('   3. Set it to public');
      console.log('   4. Re-run this script');
      return false;
    }
    console.log('✅ Bucket created successfully');
  } else {
    console.log('✅ Bucket already exists');
  }
  
  return true;
}

/**
 * Get all episodes from the database
 */
async function getEpisodes(): Promise<Episode[]> {
  console.log('\n📋 Fetching episodes from database...');
  
  const { data, error } = await supabase
    .from('episodes')
    .select('id, episode_number, title_es, video_url')
    .order('episode_number');
  
  if (error) {
    console.error('❌ Error fetching episodes:', error.message);
    return [];
  }
  
  console.log(`✅ Found ${data?.length || 0} episodes`);
  return data || [];
}

/**
 * Upload a video file to Supabase storage
 */
async function uploadVideo(episodeNumber: number, filePath: string): Promise<string | null> {
  const fileName = `Episode_${episodeNumber}.mp4`;
  const storagePath = fileName;
  
  console.log(`\n📤 Uploading Episode ${episodeNumber}...`);
  console.log(`   Source: ${filePath}`);
  console.log(`   Destination: ${BUCKET_NAME}/${storagePath}`);
  
  // Check file size
  const stats = fs.statSync(filePath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   File size: ${fileSizeMB} MB`);
  
  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  
  // Check if file already exists
  const { data: existingFile } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { search: fileName });
  
  if (existingFile && existingFile.length > 0) {
    console.log(`   ⚠️  File already exists, updating...`);
    // Remove existing file first
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
  }
  
  // Upload file
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true
    });
  
  if (uploadError) {
    console.error(`   ❌ Upload failed:`, uploadError.message);
    return null;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);
  
  console.log(`   ✅ Upload successful`);
  console.log(`   URL: ${urlData.publicUrl}`);
  
  return urlData.publicUrl;
}

/**
 * Update episode with video URL
 */
async function updateEpisodeVideoUrl(episodeId: string, videoUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('episodes')
    .update({ video_url: videoUrl })
    .eq('id', episodeId);
  
  if (error) {
    console.error(`   ❌ Failed to update episode:`, error.message);
    return false;
  }
  
  console.log(`   ✅ Episode updated with video URL`);
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('🎬 Episode Video Upload Script\n');
  console.log('='.repeat(50));
  
  // Check if videos folder exists
  if (!fs.existsSync(VIDEOS_FOLDER)) {
    console.error(`❌ Videos folder not found: ${VIDEOS_FOLDER}`);
    console.error('   Make sure the App_Final_Videos folder exists with Episode_X.mp4 files');
    process.exit(1);
  }
  
  // List video files
  const videoFiles = fs.readdirSync(VIDEOS_FOLDER)
    .filter(f => f.match(/^Episode_\d+\.mp4$/i))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  
  console.log(`\n📂 Found ${videoFiles.length} video files:`);
  videoFiles.forEach(f => console.log(`   - ${f}`));
  
  // Ensure bucket exists
  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    process.exit(1);
  }
  
  // Get episodes from database
  const episodes = await getEpisodes();
  if (episodes.length === 0) {
    console.error('❌ No episodes found in database');
    process.exit(1);
  }
  
  // Upload each video and update database
  let successCount = 0;
  let failCount = 0;
  
  for (const videoFile of videoFiles) {
    const episodeNumber = parseInt(videoFile.match(/\d+/)?.[0] || '0');
    const episode = episodes.find(e => e.episode_number === episodeNumber);
    
    if (!episode) {
      console.log(`\n⚠️  No episode found for Episode ${episodeNumber}, skipping...`);
      continue;
    }
    
    const filePath = path.join(VIDEOS_FOLDER, videoFile);
    const videoUrl = await uploadVideo(episodeNumber, filePath);
    
    if (videoUrl) {
      const updated = await updateEpisodeVideoUrl(episode.id, videoUrl);
      if (updated) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Upload Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));
  
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
