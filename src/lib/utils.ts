import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * UTF-8 safe Base64 encoding
 * Converts a string to Base64, safely handling UTF-8 characters
 */
export function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * UTF-8 safe Base64 decoding
 * Converts a Base64 string back to a UTF-8 string
 */
export function base64ToUtf8(str: string): string {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (error) {
    // Fallback for legacy data that might be plain base64
    try {
      return atob(str);
    } catch (innerError) {
      console.error("Failed to decode Base64:", innerError);
      return "Error decoding content. Please contact support.";
    }
  }
}
