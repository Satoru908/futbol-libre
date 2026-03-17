/**
 * Dynamic Meta Tag Configuration
 * Injects environment-specific URLs into HTML meta tags
 * Supports runtime configuration without rebuild
 */

import { APP_CONFIG } from './constants.js';

export class MetaConfig {
  /**
   * Update Open Graph and Twitter Card meta tags with environment-specific URLs
   * Call this early in app initialization
   */
  static updateMetaTags() {
    const siteUrl = APP_CONFIG.siteUrl;

    // Only update if we have a site URL
    if (!siteUrl) {
      console.warn('VITE_SITE_URL not configured - meta tags not updated');
      return;
    }

    // Update Open Graph meta tags
    this._updateMetaTag('property', 'og:url', siteUrl);
    this._updateMetaTag('property', 'og:image', `${siteUrl}/images/og-image.jpg`);

    // Update Twitter Card meta tags
    this._updateMetaTag('name', 'twitter:url', siteUrl);
    this._updateMetaTag('name', 'twitter:image', `${siteUrl}/images/twitter-card.jpg`);

    // Update canonical link
    this._updateCanonical(siteUrl);

    // Update alternate hreflang links
    this._updateAlternateLinks(siteUrl);
  }

  /**
   * Update a specific meta tag by property or name attribute
   * @private
   */
  static _updateMetaTag(attrName, attrValue, content) {
    let element = document.querySelector(
      `meta[${attrName}="${attrValue}"]`
    );

    if (!element) {
      // Create meta tag if it doesn't exist
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }

    element.setAttribute('content', content);
  }

  /**
   * Update canonical link
   * @private
   */
  static _updateCanonical(siteUrl) {
    let link = document.querySelector('link[rel="canonical"]');

    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }

    link.setAttribute('href', siteUrl);
  }

  /**
   * Update alternate hreflang links
   * @private
   */
  static _updateAlternateLinks(siteUrl) {
    const alternateLinks = [
      { hreflang: 'es', path: '/' },
      { hreflang: 'es-AR', path: '/ar/' },
    ];

    alternateLinks.forEach(({ hreflang, path }) => {
      let link = document.querySelector(
        `link[rel="alternate"][hreflang="${hreflang}"]`
      );

      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }

      link.setAttribute('href', `${siteUrl}${path}`);
    });
  }

  /**
   * Inject Analytics ID into inline Google Analytics script
   * @private
   */
  static injectAnalyticsId() {
    const gaId = APP_CONFIG.gaId;

    if (!gaId) {
      console.log('GA_ID not configured - analytics not initialized');
      return;
    }

    // Create gtag script
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gtagScript);

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }
}

// Auto-update on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    MetaConfig.updateMetaTags();
  });
} else {
  MetaConfig.updateMetaTags();
}
