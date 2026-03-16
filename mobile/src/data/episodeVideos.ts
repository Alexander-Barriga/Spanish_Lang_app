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
  1: require('../../assets/videos/Ep_1_Cafe_Tortoni.mp4'),
  2: require('../../assets/videos/Ep_2_Milonga_Marabu.mp4'),
  3: require('../../assets/videos/Ep_3_San_Talmo_Market.mp4'),
  4: require('../../assets/videos/Ep_4_El_Asado.mp4'),
  5: require('../../assets/videos/Ep_5_Cementerio_de_la_Chacarita.mp4'),
  6: require('../../assets/videos/Ep_6_Teatro_Colón.mp4'),
  7: require('../../assets/videos/Ep_7_El_Boca.mp4'),
  8: require('../../assets/videos/Ep_8_Farewell_at_Cafe_Tortoni.mp4'),
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
