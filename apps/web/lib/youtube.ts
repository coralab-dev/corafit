const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "m.youtu.be",
]);

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function getYouTubeVideoId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !YOUTUBE_HOSTNAMES.has(url.hostname.toLowerCase())
  ) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (hostname.endsWith("youtu.be")) {
    candidate = pathParts.length === 1 ? pathParts[0] : null;
  } else if (pathParts.length === 1 && pathParts[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (
    pathParts.length === 2 &&
    ["shorts", "embed"].includes(pathParts[0])
  ) {
    candidate = pathParts[1];
  }

  return candidate && YOUTUBE_VIDEO_ID_PATTERN.test(candidate)
    ? candidate
    : null;
}

function getYouTubeEmbedUrl(value: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}

export { getYouTubeEmbedUrl, getYouTubeVideoId };
