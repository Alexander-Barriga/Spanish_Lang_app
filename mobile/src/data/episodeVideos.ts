const R2_BASE_URL = 'https://pub-eaa84f1d0f9b40b8b0fb15b73338527c.r2.dev';

export const EPISODE_VIDEOS: Record<number, string> = {
  1: `${R2_BASE_URL}/videos/Ep_1_Cafe_Tortoni.mp4`,
  2: `${R2_BASE_URL}/videos/Ep_2_Milonga_Marabu.mp4`,
  3: `${R2_BASE_URL}/videos/Ep_3_San_Talmo_Market.mp4`,
  4: `${R2_BASE_URL}/videos/Ep_4_El_Asado.mp4`,
  5: `${R2_BASE_URL}/videos/Ep_5_Cementerio_de_la_Chacarita.mp4`,
  6: `${R2_BASE_URL}/videos/Ep_6_Teatro_Col%C3%B3n.mp4`,
  7: `${R2_BASE_URL}/videos/Ep_7_El_Boca.mp4`,
  8: `${R2_BASE_URL}/videos/Ep_8_Farewell_at_Cafe_Tortoni.mp4`,
};

/**
 * Get the R2 stream URL for a given episode number.
 * Returns the URL string or null if not found.
 */
export function getEpisodeVideo(episodeNumber: number): string | null {
  return EPISODE_VIDEOS[episodeNumber] || null;
}

/**
 * Check if a local video exists for the given episode.
 */
export function hasLocalVideo(episodeNumber: number): boolean {
  return episodeNumber in EPISODE_VIDEOS;
}
