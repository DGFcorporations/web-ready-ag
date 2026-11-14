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
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      const normalizedCanonical =
        canonical === 'https://web-ready.ag' ? 'https://web-ready.ag/' : canonical;
      link.setAttribute('href', normalizedCanonical);
    }

    // Inject JSON-LD: always remove old dynamic JSON-LD before optional re-injection
    document.querySelectorAll('script[data-dynamic-jsonld]').forEach(el => el.remove());
    if (jsonLd && jsonLd.length > 0) {
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
