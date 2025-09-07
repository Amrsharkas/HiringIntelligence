/**
 * Query configuration utilities for development vs production
 */

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

/**
 * Get the appropriate refetch interval based on environment
 * @param productionInterval - Interval to use in production (in milliseconds)
 * @param developmentInterval - Interval to use in development (default: false to disable)
 * @returns The refetch interval or false to disable
 */
export function getRefetchInterval(
  productionInterval: number,
  developmentInterval: number | false = false
): number | false {
  if (isDevelopment) {
    return developmentInterval;
  }
  return productionInterval;
}

/**
 * Get query options with environment-aware refetch intervals
 * @param productionInterval - Interval to use in production (in milliseconds)
 * @param developmentInterval - Interval to use in development (default: false to disable)
 * @returns Query options object
 */
export function getQueryOptions(
  productionInterval: number,
  developmentInterval: number | false = false
) {
  return {
    refetchInterval: getRefetchInterval(productionInterval, developmentInterval),
    refetchIntervalInBackground: !isDevelopment, // Only refetch in background in production
  };
}
