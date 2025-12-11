import Parser from 'rss-parser';
import { supabaseAdmin } from '../config/supabase';
import { openai } from '../config/openai';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent', { keepArray: true }],
    ],
  },
});

const RSS_FEED_URL = 'https://thespanishlangaugelab.substack.com/feed';

// Get valid grammar tags from the database
async function getValidGrammarTags(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('grammar_curriculum')
    .select('grammar_focus');
  
  return [...new Set(data?.map(d => d.grammar_focus) || [])];
}

// Use AI to detect grammar tags from article content
async function detectGrammarTags(content: string, validTags: string[]): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a Spanish language education expert. Analyze the following Spanish learning article and identify which grammar topics it covers.

Return ONLY a JSON array of matching values from this list:
${JSON.stringify(validTags)}

If no topics match, return an empty array [].
Do not include any other text, just the JSON array.`
        },
        {
          role: 'user',
          content: content.substring(0, 3000) // Limit content length for API
        }
      ],
      temperature: 0,
      max_tokens: 200
    });

    const responseText = completion.choices[0].message.content?.trim() || '[]';
    const tags = JSON.parse(responseText);
    
    // Validate that returned tags are in our valid list
    return tags.filter((tag: string) => validTags.includes(tag));
  } catch (error) {
    console.error('Error detecting grammar tags:', error);
    return [];
  }
}

// Extract image URL from RSS item
function extractImageUrl(item: any): string | null {
  // Try media:content first
  if (item.mediaContent && item.mediaContent.length > 0) {
    return item.mediaContent[0].$.url;
  }
  
  // Try to extract from content
  if (item.contentEncoded || item.content) {
    const content = item.contentEncoded || item.content;
    const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
    if (imgMatch) {
      return imgMatch[1];
    }
  }
  
  return null;
}

// Calculate word count and read time
function calculateReadTime(content: string): { wordCount: number; readMinutes: number } {
  // Strip HTML tags
  const text = content.replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ');
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
  
  return { wordCount, readMinutes };
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

// Extract substack ID from URL
function extractSubstackId(url: string): string {
  // URL like https://thespanishlangaugelab.substack.com/p/article-title
  const match = url.match(/\/p\/([^/?]+)/);
  return match ? match[1] : url;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

// Sync articles from Substack RSS feed
export async function syncArticlesFromRSS(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting RSS sync from Substack...');
    
    // Fetch RSS feed
    const feed = await parser.parseURL(RSS_FEED_URL);
    console.log(`📰 Found ${feed.items.length} articles in feed`);

    // Get valid grammar tags
    const validTags = await getValidGrammarTags();
    console.log(`📚 Valid grammar tags: ${validTags.length}`);

    for (const item of feed.items) {
      try {
        const substackId = extractSubstackId(item.link || '');
        
        // Check if article already exists
        const { data: existing } = await supabaseAdmin
          .from('articles')
          .select('id')
          .eq('substack_id', substackId)
          .single();

        if (existing) {
          result.skipped++;
          continue;
        }

        // Extract article data
        const content = item.contentEncoded || item.content || '';
        const imageUrl = extractImageUrl(item);
        const { wordCount, readMinutes } = calculateReadTime(content);
        const slug = generateSlug(item.title || 'untitled');

        // Detect grammar tags using AI
        const grammarTags = await detectGrammarTags(content, validTags);

        // Insert new article
        const { error } = await supabaseAdmin
          .from('articles')
          .insert({
            substack_id: substackId,
            title: item.title || 'Untitled',
            subtitle: item.contentSnippet?.substring(0, 200) || null,
            slug,
            image_url: imageUrl,
            content_html: content,
            author: item.creator || 'Alexander Barriga',
            published_at: item.pubDate || new Date().toISOString(),
            grammar_tags: grammarTags,
            word_count: wordCount,
            estimated_read_minutes: readMinutes,
            substack_url: item.link || ''
          });

        if (error) {
          result.errors.push(`Failed to insert "${item.title}": ${error.message}`);
        } else {
          result.synced++;
          console.log(`✅ Synced: ${item.title} (tags: ${grammarTags.join(', ') || 'none'})`);
        }
      } catch (itemError) {
        result.errors.push(`Error processing "${item.title}": ${itemError}`);
      }
    }

    console.log(`🎉 Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  } catch (error) {
    console.error('❌ RSS sync failed:', error);
    result.errors.push(`RSS sync failed: ${error}`);
    return result;
  }
}

// Check if sync is needed (last sync > 1 hour ago)
export async function shouldSync(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('articles')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    return true; // No articles, definitely sync
  }

  const lastSync = new Date(data.created_at);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return lastSync < oneHourAgo;
}

