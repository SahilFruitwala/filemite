import React from "react";

type GlowColor = "primary" | "emerald" | "amber" | "teal" | "zinc";

interface BackgroundGlowProps {
  color?: GlowColor;
}

// BackgroundGlow is largely disabled in the Neubrutalist redesign
// as we prefer a flat, high-contrast grid look.
export default function BackgroundGlow({
  color = "primary",
}: BackgroundGlowProps) {
  return null;
}
