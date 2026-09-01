import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

export default function SEO({ title, description, canonical, ogImage }: SEOProps) {
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
  }, [title, description, canonical, ogImage]);

  return null;
}
