import { getAvatarInitial } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  className?: string;
};

export function UserAvatar({ name, email, className }: UserAvatarProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm",
        className,
      )}
      aria-label="User avatar"
      title={name || email || "User"}
    >
      {getAvatarInitial(name, email)}
    </div>
  );
}
