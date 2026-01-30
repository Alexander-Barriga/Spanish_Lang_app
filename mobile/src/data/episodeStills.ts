/**
 * Episode Stills Mapping
 * 
 * Maps episode numbers to locally bundled still images extracted from videos.
 * These are used as thumbnails on the Episodes page and backgrounds on the Home page.
 */

// Map episode numbers to local still image assets
// require() returns an asset module ID that Image component can use
export const EPISODE_STILLS: Record<number, any> = {
  1: require('../../assets/images/episode-stills/episode_1_still.png'),
  2: require('../../assets/images/episode-stills/episode_2_still.png'),
  3: require('../../assets/images/episode-stills/episode_3_still.png'),
  4: require('../../assets/images/episode-stills/episode_4_still.png'),
  5: require('../../assets/images/episode-stills/episode_5_still.png'),
  6: require('../../assets/images/episode-stills/episode_6_still.png'),
  7: require('../../assets/images/episode-stills/episode_7_still.png'),
  8: require('../../assets/images/episode-stills/episode_8_still.png'),
};

/**
 * Get the still image source for a given episode number.
 * Returns the local asset module ID or null if not found.
 */
export function getEpisodeStill(episodeNumber: number): any | null {
  return EPISODE_STILLS[episodeNumber] || null;
}

/**
 * Check if a local still image exists for the given episode.
 */
export function hasEpisodeStill(episodeNumber: number): boolean {
  return episodeNumber in EPISODE_STILLS;
}
