/**
 * Episode Video Mapping
 * 
 * Maps episode numbers to locally bundled video assets.
 * This is a short-term solution to bypass cloud storage limits.
 * 
 * Future: Replace with cloud URLs when storage is available.
 */

// Map episode numbers to local video assets
// require() returns an asset module ID that expo-av can use
export const EPISODE_VIDEOS: Record<number, any> = {
  1: require('../../assets/videos/Episode_1.mp4'),
  2: require('../../assets/videos/Episode_2.mp4'),
  3: require('../../assets/videos/Episode_3.mp4'),
  4: require('../../assets/videos/Episode_4.mp4'),
  5: require('../../assets/videos/Episode_5.mp4'),
  6: require('../../assets/videos/Episode_6.mp4'),
  7: require('../../assets/videos/Episode_7.mp4'),
  8: require('../../assets/videos/Episode_8.mp4'),
};

/**
 * Get the video source for a given episode number.
 * Returns the local asset module ID or null if not found.
 */
export function getEpisodeVideo(episodeNumber: number): any | null {
  return EPISODE_VIDEOS[episodeNumber] || null;
}

/**
 * Check if a local video exists for the given episode.
 */
export function hasLocalVideo(episodeNumber: number): boolean {
  return episodeNumber in EPISODE_VIDEOS;
}
