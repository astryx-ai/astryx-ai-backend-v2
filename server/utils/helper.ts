import axios from "axios";

export const logInfo = ({ message, data }: { message: string; data: any }) => {
  console.log(`${message}: ${data}`);
};

export const logError = ({ message, data }: { message: string; data: any }) => {
  console.error(`${message}: ${data}`);
};

// Simple URL extractor for http(s) links (more robust trailing cleanup)
export const extractUrls = (text: string): string[] => {
  if (!text) return [];
  const urlRegex =
    /https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\._~:\/?#\[\]@!$&'()*+,;=%])*/gi;
  const urls = text.match(urlRegex) || [];
  return Array.from(
    new Set(
      urls
        .map((u) =>
          u
            // Remove common trailing noise: ), ], ., ,, *, quotes, >
            .replace(/[)\]\.,*'">]+$/g, "")
            // Remove stray trailing parentheses or asterisks like **) or )
            .replace(/[)*]+$/g, "")
            .trim()
        )
        .filter((u) => u.length > 0)
    )
  ).slice(0, 10);
};

type SourceMeta = {
  title: string;
  url: string;
  ogImageUrl: string | null;
};

// Fetch metadata from a URL: tries OpenGraph/Twitter cards and falls back to <title>
export const fetchSourceMeta = async (url: string): Promise<SourceMeta> => {
  try {
    const resp = await axios.get<string>(url, {
      timeout: 8000,
      // Send a desktop UA to improve OG tag availability
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      // Don't follow too many redirects
      maxRedirects: 5,
      // We only need the text/html; axios will parse as string
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = resp.data || "";
    // Robust meta extractor supporting various attribute orders and spacing
    const extractMetaContent = (
      htmlText: string,
      propertyOrName: string,
      isProperty = true
    ): string | null => {
      const attribute = isProperty ? "property" : "name";
      const escaped = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(
          `<meta[^>]*\\s${attribute}\\s*=\\s*["']${escaped}["'][^>]*\\scontent\\s*=\\s*["']([^"']+)["'][^>]*>`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*\\scontent\\s*=\\s*["']([^"']+)["'][^>]*\\s${attribute}\\s*=\\s*["']${escaped}["'][^>]*>`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']+)["'][^>]*>`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*content\\s*=\\s*["']([^"']+)["'][^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*>`,
          "i"
        ),
        new RegExp(
          `<meta[^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*>`,
          "i"
        ),
      ];
      for (const pattern of patterns) {
        const match = htmlText.match(pattern);
        if (match && match[1]) return match[1].trim();
      }
      const metaTagPattern = new RegExp(
        `<meta[^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*>`,
        "i"
      );
      const metaTag = htmlText.match(metaTagPattern);
      if (metaTag && metaTag[0]) {
        const contentMatch = metaTag[0].match(
          /content\\s*=\\s*["']([^"']+)["']/i
        );
        if (contentMatch && contentMatch[1]) return contentMatch[1].trim();
      }
      return null;
    };

    // Title extraction (prefer OG/Twitter)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitle = extractMetaContent(html, "og:title", true);
    const twTitle = extractMetaContent(html, "twitter:title", false);
    const title =
      ogTitle || twTitle || (titleMatch && titleMatch[1].trim()) || url;

    // Image extraction with multiple fallbacks
    let rawImage =
      extractMetaContent(html, "og:image", true) ||
      extractMetaContent(html, "twitter:image", false) ||
      extractMetaContent(html, "twitter:image:src", false) ||
      null;

    // Economic Times and similar CMS-managed images
    if (url.includes("economictimes.indiatimes.com") && !rawImage) {
      const etImagePattern =
        /property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
      const etMatch = html.match(etImagePattern);
      if (etMatch && etMatch[1]) {
        rawImage = etMatch[1].trim();
      }
    }

    const ogImageUrl = rawImage ? normalizeImageUrl(rawImage, url) : null;

    return { title, url, ogImageUrl };
  } catch (e) {
    return { title: url, url, ogImageUrl: null };
  }
};

// Normalize and improve image URLs for better frontend compatibility
const normalizeImageUrl = (imageUrl: string, baseUrl: string): string => {
  try {
    // Remove HTML entities
    let cleanUrl = imageUrl
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Handle relative URLs
    if (cleanUrl.startsWith("//")) {
      // Protocol-relative URL
      const baseProtocol = new URL(baseUrl).protocol;
      cleanUrl = `${baseProtocol}${cleanUrl}`;
    } else if (cleanUrl.startsWith("/")) {
      // Absolute path
      const baseOrigin = new URL(baseUrl).origin;
      cleanUrl = `${baseOrigin}${cleanUrl}`;
    } else if (!cleanUrl.startsWith("http")) {
      // Relative path
      const baseUrlObj = new URL(baseUrl);
      cleanUrl = new URL(cleanUrl, baseUrlObj).href;
    }

    // Convert some problematic domains to more reliable CDN URLs
    const urlObj = new URL(cleanUrl);

    // Handle Facebook images - use scontent CDN
    if (
      urlObj.hostname.includes("facebook.com") ||
      urlObj.hostname.includes("fbcdn.net")
    ) {
      return cleanUrl; // Keep original
    }

    // Handle Instagram images
    if (
      urlObj.hostname.includes("instagram.com") ||
      urlObj.hostname.includes("cdninstagram.com")
    ) {
      return cleanUrl;
    }

    // Handle Twitter images - ensure they're using the right CDN
    if (
      urlObj.hostname.includes("twitter.com") ||
      urlObj.hostname.includes("twimg.com")
    ) {
      if (
        urlObj.hostname === "pbs.twitter.com" ||
        urlObj.hostname === "pbs.twimg.com"
      ) {
        return cleanUrl;
      }
    }

    // Handle YouTube thumbnails - ensure we're using the most reliable format
    if (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("ytimg.com")
    ) {
      if (urlObj.pathname.includes("/vi/")) {
        // Convert to high-quality thumbnail if it's a video thumbnail
        const videoIdMatch = urlObj.pathname.match(/\/vi\/([^\/]+)/);
        if (videoIdMatch) {
          return `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
        }
      }
    }

    // Add size parameters for better loading (where supported)
    if (urlObj.searchParams.has("width") || urlObj.searchParams.has("w")) {
      // Ensure reasonable max width for frontend
      const width = Math.min(
        parseInt(
          urlObj.searchParams.get("width") ||
            urlObj.searchParams.get("w") ||
            "800"
        ),
        1200
      );
      urlObj.searchParams.set("width", width.toString());
    }

    return urlObj.href;
  } catch (e) {
    // If URL parsing fails, return the original
    return imageUrl;
  }
};
