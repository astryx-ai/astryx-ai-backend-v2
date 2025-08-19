import axios from "axios";

export const logInfo = ({ message, data }: { message: string; data: any }) => {
  console.log(`${message}: ${data}`);
};

export const logError = ({ message, data }: { message: string; data: any }) => {
  console.error(`${message}: ${data}`);
};

// Simple URL extractor for http(s) links
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex =
    /https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\._~:\/?#\[\]@!$&'()*+,;=%])*/gi;
  const urls = text.match(urlRegex) || [];
  // Remove trailing punctuation like ).,]
  return Array.from(
    new Set(urls.map((u) => u.replace(/[)\]\.,]+$/g, "").trim()))
  ).slice(0, 10); // cap to avoid excessive fetches
};

type SourceMeta = { title: string; url: string; image: string | null };

// Fetch metadata from a URL: tries OpenGraph/Twitter cards and falls back to <title>
export const fetchSourceMeta = async (url: string): Promise<SourceMeta> => {
  try {
    const resp = await axios.get<string>(url, {
      timeout: 6000,
      // Send a desktop UA to improve OG tag availability
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // Don't follow too many redirects
      maxRedirects: 3,
      // We only need the text/html; axios will parse as string
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = resp.data || "";
    // Title extraction
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const twTitleMatch = html.match(
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const title =
      (ogTitleMatch && ogTitleMatch[1]) ||
      (twTitleMatch && twTitleMatch[1]) ||
      (titleMatch && titleMatch[1].trim()) ||
      url;

    // Image extraction
    const ogImageMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const twImageMatch = html.match(
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );
    const image =
      (ogImageMatch && ogImageMatch[1]) ||
      (twImageMatch && twImageMatch[1]) ||
      null;

    return { title, url, image };
  } catch (e) {
    return { title: url, url, image: null };
  }
};
