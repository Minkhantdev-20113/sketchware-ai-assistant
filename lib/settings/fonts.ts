import type { FontFamilyId } from "@/lib/settings/types";

export const fontOptions: Array<{ id: FontFamilyId; label: string; stack: string }> =
  [
    {
      id: "system-ui",
      label: "System UI",
      stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    {
      id: "inter",
      label: "Inter",
      stack: 'Inter, system-ui, sans-serif',
    },
    {
      id: "roboto",
      label: "Roboto",
      stack: 'Roboto, system-ui, sans-serif',
    },
    {
      id: "segoe-ui",
      label: "Segoe UI",
      stack: '"Segoe UI", Tahoma, sans-serif',
    },
    {
      id: "fira-code",
      label: "Fira Code",
      stack: '"Fira Code", ui-monospace, monospace',
    },
    {
      id: "jetbrains-mono",
      label: "JetBrains Mono",
      stack: '"JetBrains Mono", ui-monospace, monospace',
    },
    {
      id: "source-code-pro",
      label: "Source Code Pro",
      stack: '"Source Code Pro", ui-monospace, monospace',
    },
    {
      id: "cascadia-code",
      label: "Cascadia Code (VS Code)",
      stack: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
    },
    {
      id: "android-studio",
      label: "Android Studio Default",
      stack: '"JetBrains Mono", "Roboto Mono", "Droid Sans Mono", monospace',
    },
  ];

export function getFontStack(id: FontFamilyId) {
  return fontOptions.find((font) => font.id === id)?.stack ?? fontOptions[0].stack;
}
