export function getAvatarInitial(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  return source.charAt(0).toUpperCase();
}

export function getDisplayName(name?: string | null, email?: string | null) {
  return name?.trim() || email?.split("@")[0] || "User";
}
