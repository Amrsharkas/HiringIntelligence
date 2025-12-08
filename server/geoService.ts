import { redisConnection } from './redis';

interface GeoLocation {
  countryCode: string;
  countryName: string;
  city?: string;
  region?: string;
}

interface IpApiResponse {
  status: string;
  country: string;
  countryCode: string;
  city: string;
  regionName: string;
  query: string;
}

class GeoService {
  private readonly CACHE_PREFIX = 'geo:ip:';
  private readonly CACHE_TTL = 86400; // 24 hours in seconds
  private readonly DEFAULT_COUNTRY: GeoLocation = { countryCode: 'EG', countryName: 'Egypt' };
  private readonly IP_API_URL = 'http://ip-api.com/json';

  // Rate limiting: 45 requests/minute for free tier
  private requestCount = 0;
  private resetTime = Date.now() + 60000;

  // In-memory cache fallback if Redis is unavailable
  private memoryCache = new Map<string, { location: GeoLocation; expiresAt: number }>();

  /**
   * Get country from IP address
   */
  async getCountryFromIp(ip: string): Promise<GeoLocation> {
    try {
      // Normalize IP (handle localhost, IPv6 localhost, etc.)
      const normalizedIp = this.normalizeIp(ip);

      // For localhost/development, return default
      if (this.isLocalIp(normalizedIp)) {
        return this.DEFAULT_COUNTRY;
      }

      // Check cache first
      const cached = await this.getCachedLocation(normalizedIp);
      if (cached) {
        return cached;
      }

      // Check rate limit
      if (!this.canMakeRequest()) {
        console.warn('GeoService: Rate limit reached, returning default');
        return this.DEFAULT_COUNTRY;
      }

      // Fetch from ip-api.com
      const response = await fetch(
        `${this.IP_API_URL}/${normalizedIp}?fields=status,country,countryCode,city,regionName`,
        { signal: AbortSignal.timeout(5000) } // 5 second timeout
      );

      if (!response.ok) {
        throw new Error(`IP API returned ${response.status}`);
      }

      const data: IpApiResponse = await response.json();
      this.requestCount++;

      if (data.status !== 'success') {
        console.warn(`GeoService: API returned failure for IP ${normalizedIp}`);
        return this.DEFAULT_COUNTRY;
      }

      const location: GeoLocation = {
        countryCode: data.countryCode,
        countryName: data.country,
        city: data.city,
        region: data.regionName,
      };

      // Cache the result
      await this.cacheLocation(normalizedIp, location);

      return location;
    } catch (error) {
      console.error('GeoService: Error detecting country:', error);
      return this.DEFAULT_COUNTRY;
    }
  }

  /**
   * Get supported country code (map to supported pricing region)
   * Returns the country code if it's supported, otherwise returns default (EG)
   */
  async getSupportedCountryCode(ip: string): Promise<string> {
    const location = await this.getCountryFromIp(ip);

    // Map to supported countries (expand as needed)
    const supportedCountries = ['EG', 'US'];

    if (supportedCountries.includes(location.countryCode)) {
      return location.countryCode;
    }

    // Default to Egypt for unsupported countries
    return 'EG';
  }

  /**
   * Get full location info and supported country code
   */
  async getLocationInfo(ip: string): Promise<{ detected: GeoLocation; supported: string }> {
    const detected = await this.getCountryFromIp(ip);
    const supportedCountries = ['EG', 'US'];
    const supported = supportedCountries.includes(detected.countryCode)
      ? detected.countryCode
      : 'EG';

    return { detected, supported };
  }

  private normalizeIp(ip: string): string {
    // Handle X-Forwarded-For (take first IP)
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    // Remove IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    return ip;
  }

  private isLocalIp(ip: string): boolean {
    return ip === '127.0.0.1' ||
           ip === '::1' ||
           ip === 'localhost' ||
           ip.startsWith('192.168.') ||
           ip.startsWith('10.') ||
           ip.startsWith('172.16.') ||
           ip.startsWith('172.17.') ||
           ip.startsWith('172.18.') ||
           ip.startsWith('172.19.') ||
           ip.startsWith('172.20.') ||
           ip.startsWith('172.21.') ||
           ip.startsWith('172.22.') ||
           ip.startsWith('172.23.') ||
           ip.startsWith('172.24.') ||
           ip.startsWith('172.25.') ||
           ip.startsWith('172.26.') ||
           ip.startsWith('172.27.') ||
           ip.startsWith('172.28.') ||
           ip.startsWith('172.29.') ||
           ip.startsWith('172.30.') ||
           ip.startsWith('172.31.');
  }

  private async getCachedLocation(ip: string): Promise<GeoLocation | null> {
    const cacheKey = `${this.CACHE_PREFIX}${ip}`;

    // Try Redis first
    try {
      if (redisConnection.status === 'ready') {
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.error('GeoService: Redis cache read error:', error);
    }

    // Fall back to in-memory cache
    const memCached = this.memoryCache.get(ip);
    if (memCached && memCached.expiresAt > Date.now()) {
      return memCached.location;
    }

    // Clean up expired entry
    if (memCached) {
      this.memoryCache.delete(ip);
    }

    return null;
  }

  private async cacheLocation(ip: string, location: GeoLocation): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${ip}`;

    // Try Redis first
    try {
      if (redisConnection.status === 'ready') {
        await redisConnection.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(location)
        );
        return;
      }
    } catch (error) {
      console.error('GeoService: Redis cache write error:', error);
    }

    // Fall back to in-memory cache
    this.memoryCache.set(ip, {
      location,
      expiresAt: Date.now() + (this.CACHE_TTL * 1000),
    });

    // Clean up old entries if cache gets too large
    if (this.memoryCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.memoryCache) {
        if (value.expiresAt < now) {
          this.memoryCache.delete(key);
        }
      }
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
    }
    return this.requestCount < 45; // ip-api.com limit
  }
}

export const geoService = new GeoService();
