/**
 * StoryMap — Analyseur d'intégration vidéo (YouTube, Vimeo, MP4 direct) (N3)
 */

export interface ParsedVideoEmbed {
  type: 'youtube' | 'vimeo' | 'direct';
  embedUrl: string;
  isEmbed: boolean;
}

export function parseVideoEmbedUrl(rawUrl?: string): ParsedVideoEmbed {
  if (!rawUrl || typeof rawUrl !== 'string') return { type: 'direct', embedUrl: '', isEmbed: false };
  const url = rawUrl.trim();

  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (yt && yt[1]) {
    const id = yt[1];
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&playsinline=1`,
      isEmbed: true,
    };
  }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm && vm[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1&controls=0&playsinline=1`,
      isEmbed: true,
    };
  }

  return { type: 'direct', embedUrl: url, isEmbed: false };
}

export function cleanGoogleRedirectUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const m = url.match(/[?&]url=([^&]+)/i);
  if (m && m[1]) {
    try { return decodeURIComponent(m[1]); } catch { return url; }
  }
  return url;
}

