/**
 * Link Episode Images Script
 * 
 * This script fetches existing images from the narrative-images bucket
 * and updates episode scenes with the correct image URLs.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const BUCKET_NAME = 'narrative-images';

interface Scene {
  scene_id: string;
  scene_number: number;
  scene_image_url?: string;
  scene_image_storage_path?: string;
  [key: string]: any;
}

interface Episode {
  id: string;
  episode_number: number;
  scenes: Scene[];
}

async function listBucketImages(): Promise<Map<string, string>> {
  console.log('📂 Listing images in narrative-images bucket...\n');
  
  const imageMap = new Map<string, string>();
  
  // List all folders in the bucket (episodes/1, episodes/2, etc.)
  const { data: episodeFolders, error: folderError } = await supabase.storage
    .from(BUCKET_NAME)
    .list('episodes', { limit: 100 });
  
  if (folderError) {
    console.error('Error listing episode folders:', folderError);
    return imageMap;
  }
  
  console.log(`Found ${episodeFolders?.length || 0} episode folders`);
  
  // For each episode folder, list scenes
  for (const folder of episodeFolders || []) {
    if (folder.name) {
      const episodeNum = folder.name;
      
      // List scenes folder
      const { data: sceneFiles, error: sceneError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`episodes/${episodeNum}/scenes`, { limit: 100 });
      
      if (sceneError) {
        console.error(`Error listing scenes for episode ${episodeNum}:`, sceneError);
        continue;
      }
      
      console.log(`  Episode ${episodeNum}: ${sceneFiles?.length || 0} scene images`);
      
      for (const file of sceneFiles || []) {
        if (file.name && (file.name.endsWith('.png') || file.name.endsWith('.webp') || file.name.endsWith('.jpg'))) {
          const storagePath = `episodes/${episodeNum}/scenes/${file.name}`;
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
          
          // Extract scene ID from filename (e.g., "ep1_scene1.png" -> "ep1_scene1")
          const sceneId = file.name.replace(/\.(png|webp|jpg)$/, '');
          const key = `${episodeNum}:${sceneId}`;
          
          imageMap.set(key, publicUrl);
          console.log(`    - ${file.name}`);
        }
      }
    }
  }
  
  console.log(`\n✅ Found ${imageMap.size} total images`);
  return imageMap;
}

async function updateEpisodeScenes(imageMap: Map<string, string>): Promise<void> {
  console.log('\n📝 Updating episode scenes with image URLs...\n');
  
  // Fetch all episodes
  const { data: episodes, error: episodeError } = await supabase
    .from('episodes')
    .select('id, episode_number, scenes')
    .order('episode_number', { ascending: true });
  
  if (episodeError) {
    console.error('Error fetching episodes:', episodeError);
    return;
  }
  
  let totalUpdated = 0;
  
  for (const episode of episodes || []) {
    const episodeNum = episode.episode_number;
    const scenes: Scene[] = episode.scenes || [];
    let hasUpdates = false;
    
    console.log(`Episode ${episodeNum}: ${scenes.length} scenes`);
    
    // Update each scene with image URL if available
    const updatedScenes = scenes.map((scene, index) => {
      // Try different key formats to match images
      const possibleKeys = [
        `${episodeNum}:${scene.scene_id}`,
        `${episodeNum}:ep${episodeNum}_scene${scene.scene_number}`,
        `${episodeNum}:scene_${scene.scene_number}`,
        `${episodeNum}:scene${scene.scene_number}`,
      ];
      
      let imageUrl: string | undefined;
      let matchedKey: string | undefined;
      
      for (const key of possibleKeys) {
        if (imageMap.has(key)) {
          imageUrl = imageMap.get(key);
          matchedKey = key;
          break;
        }
      }
      
      if (imageUrl && !scene.scene_image_url) {
        console.log(`  ✅ Scene ${scene.scene_number} (${scene.scene_id}): Linked image`);
        hasUpdates = true;
        totalUpdated++;
        return {
          ...scene,
          scene_image_url: imageUrl,
          scene_image_storage_path: `episodes/${episodeNum}/scenes/${scene.scene_id}.png`,
        };
      } else if (scene.scene_image_url) {
        console.log(`  ⏭️  Scene ${scene.scene_number}: Already has image`);
      } else {
        console.log(`  ⚠️  Scene ${scene.scene_number} (${scene.scene_id}): No matching image found`);
      }
      
      return scene;
    });
    
    if (hasUpdates) {
      // Update the episode in the database
      const { error: updateError } = await supabase
        .from('episodes')
        .update({ scenes: updatedScenes })
        .eq('id', episode.id);
      
      if (updateError) {
        console.error(`  ❌ Failed to update episode ${episodeNum}:`, updateError);
      } else {
        console.log(`  💾 Episode ${episodeNum} updated in database`);
      }
    }
    
    console.log('');
  }
  
  console.log(`\n✅ Updated ${totalUpdated} scene images total`);
}

async function showBucketContents(): Promise<void> {
  console.log('\n📂 Full bucket contents:\n');
  
  // Try listing root
  const { data: rootFiles, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', { limit: 100 });
  
  if (error) {
    console.error('Error listing bucket:', error);
    return;
  }
  
  console.log('Root level:', rootFiles?.map(f => f.name).join(', ') || 'empty');
  
  // List each subfolder
  for (const item of rootFiles || []) {
    if (item.id === null) { // It's a folder
      const { data: subFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(item.name, { limit: 100 });
      
      console.log(`\n/${item.name}/:`);
      for (const sub of subFiles || []) {
        if (sub.id === null) {
          // Another folder
          const { data: deepFiles } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`${item.name}/${sub.name}`, { limit: 100 });
          console.log(`  /${sub.name}/: ${deepFiles?.map(f => f.name).join(', ') || 'empty'}`);
        } else {
          console.log(`  - ${sub.name}`);
        }
      }
    }
  }
}

async function main(): Promise<void> {
  console.log('🖼️  Link Episode Images Script\n');
  console.log('='.repeat(50));
  
  // First, show what's in the bucket
  await showBucketContents();
  
  // List all images in the bucket
  const imageMap = await listBucketImages();
  
  if (imageMap.size === 0) {
    console.log('\n⚠️  No images found in bucket. Please check:');
    console.log('   1. Images exist in the narrative-images bucket');
    console.log('   2. Images are in the episodes/{num}/scenes/ folder structure');
    console.log('   3. Image filenames match scene IDs (e.g., ep1_scene1.png)');
    return;
  }
  
  // Update episode scenes
  await updateEpisodeScenes(imageMap);
  
  console.log('\n✅ Done!');
}

main().catch(console.error);

