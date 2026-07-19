import { describe, expect, it } from "vitest";
import { getYouTubeEmbedUrl, getYouTubeVideoId } from "./youtube";

const videoId = "dQw4w9WgXcQ";

describe("YouTube URL helpers", () => {
  it.each([
    `https://youtube.com/watch?v=${videoId}`,
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://m.youtube.com/watch?v=${videoId}`,
  ])("extracts IDs from watch URLs: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBe(videoId);
  });

  it("extracts IDs from short URLs", () => {
    expect(getYouTubeVideoId(`https://youtu.be/${videoId}`)).toBe(videoId);
  });

  it("extracts IDs from Shorts URLs", () => {
    expect(getYouTubeVideoId(`https://youtube.com/shorts/${videoId}`)).toBe(
      videoId,
    );
  });

  it("extracts IDs from embed URLs", () => {
    expect(getYouTubeVideoId(`https://youtube.com/embed/${videoId}`)).toBe(
      videoId,
    );
  });

  it("ignores supported URL parameters", () => {
    expect(
      getYouTubeVideoId(
        `https://www.youtube.com/watch?v=${videoId}&si=tracking&feature=share`,
      ),
    ).toBe(videoId);
  });

  it.each([
    `https://youtube.com.evil.example/watch?v=${videoId}`,
    `https://notyoutube.com/watch?v=${videoId}`,
    `https://example.com/watch?v=${videoId}`,
  ])("rejects domains that are not YouTube: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });

  it.each([
    "https://youtube.com/watch",
    "https://youtube.com/watch?v=",
    "https://youtu.be/",
    "https://youtube.com/shorts/not-a-video-id",
    "https://youtube.com/embed/not-a-video-id",
    "not a url",
  ])("rejects URLs without a valid ID: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBeNull();
  });

  it.each([
    `http://youtube.com/watch?v=${videoId}`,
    `https://youtube.com/watch?v=${videoId}`,
  ])("accepts HTTP and HTTPS URLs: %s", (url) => {
    expect(getYouTubeVideoId(url)).toBe(videoId);
  });

  it("returns a privacy-enhanced embed URL", () => {
    expect(getYouTubeEmbedUrl(`https://youtube.com/watch?v=${videoId}`)).toBe(
      `https://www.youtube-nocookie.com/embed/${videoId}`,
    );
  });

  it("returns null for unsupported providers", () => {
    expect(getYouTubeEmbedUrl("https://vimeo.com/123456789")).toBeNull();
  });
});
