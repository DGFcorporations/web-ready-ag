import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: object[];
}

export default function SEO({ title, description, canonical, ogImage, jsonLd }: SEOProps) {
  useEffect(() => {
    document.title = title;

    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      const tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute(attribute, value);
      }
    };

    updateMetaTag('meta[name="description"]', 'content', description);

    updateMetaTag('meta[property="og:title"]', 'content', title);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    if (ogImage) {
      updateMetaTag('meta[property="og:image"]', 'content', ogImage);
    }

    updateMetaTag('meta[property="twitter:title"]', 'content', title);
    updateMetaTag('meta[property="twitter:description"]', 'content', description);
    if (ogImage) {
      updateMetaTag('meta[property="twitter:image"]', 'content', ogImage);
    }

    if (canonical) {
      const link = document.querySelector('link[rel="canonical"]');
      if (link) {
        link.setAttribute('href', canonical);
      }
    }

    // Inject JSON-LD: remove old dynamic JSON-LD, add new
    if (jsonLd && jsonLd.length > 0) {
      // Remove previously injected dynamic JSON-LD blocks
      document.querySelectorAll('script[data-dynamic-jsonld]').forEach(el => el.remove());
      jsonLd.forEach(obj => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic-jsonld', 'true');
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
      });
    }
  }, [title, description, canonical, ogImage, jsonLd]);

  return null;
}
