/**
 * Environment variable helpers
 * Provides type-safe access to environment variables with proper error handling
 */

/**
 * Requires an environment variable to be set
 * Throws an error if the variable is missing (useful for build-time validation)
 * 
 * @param name - The environment variable name (e.g., "NEXT_PUBLIC_API_URL")
 * @returns The environment variable value as a string
 * @throws Error if the environment variable is not set
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please set this variable in your environment or .env.local file.`
    );
  }
  
  return value;
}

/**
 * Gets an environment variable with an optional default value
 * 
 * @param name - The environment variable name
 * @param defaultValue - Optional default value if variable is not set
 * @returns The environment variable value or the default value
 */
export function getEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

