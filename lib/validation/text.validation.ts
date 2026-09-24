const EMOJI_REGEX =
  /[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;

const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const UNSAFE_TEXT_REGEX =
  /(<\s*\/?\s*[a-zA-Z]{1,20}\s*[^>]*>)|javascript:|vbscript:|expression\s*\(|on[a-z]+\s*=|--\s|\/\*|\*\/|;\s*(select|insert|update|delete|drop|alter|truncate|create|exec|execute)\b/i;

const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M}'\-. ]*$/u;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function hasEmoji(value: string): boolean {
  return EMOJI_REGEX.test(value);
}

export function containsControlCharacters(value: string): boolean {
  return CONTROL_CHAR_REGEX.test(value);
}

export function containsUnsafeCharacters(value: string): boolean {
  return UNSAFE_TEXT_REGEX.test(value);
}

export function sanitizeText(value: string): string {
  if (typeof value !== "string") return "";
  return value
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function isSafeName(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return false;
  return NAME_REGEX.test(trimmed) && !hasEmoji(trimmed) && !containsUnsafeCharacters(trimmed);
}

export function isSafeEmail(value: string): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed) && !hasEmoji(trimmed) && !containsUnsafeCharacters(trimmed);
}

export function isSafePassword(value: string): boolean {
  if (typeof value !== "string") return false;
  return (
    value.length >= 8 &&
    !/\s/.test(value) &&
    !hasEmoji(value) &&
    !containsControlCharacters(value) &&
    !containsUnsafeCharacters(value)
  );
}