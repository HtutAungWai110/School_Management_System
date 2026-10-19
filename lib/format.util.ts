/** Two-letter monogram for avatars without a picture. */
export function initialsOf(name: string | null | undefined) {
  if (!name) return "CP";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Feed-style age. Past a week a relative label stops being useful, so it
 * becomes a plain date. The exact timestamp is kept as the title.
 */
export function timeAgo(value: string) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const title = date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (seconds < 60) return { label: "Just now", title };

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { label: `${minutes}m ago`, title };

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: `${hours}h ago`, title };

  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `${days}d ago`, title };

  return {
    label: date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    title,
  };
}
