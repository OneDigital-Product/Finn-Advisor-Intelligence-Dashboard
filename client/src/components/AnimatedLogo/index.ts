export { AnimatedLogo } from "./AnimatedLogo";
export type { AnimatedLogoProps } from "./AnimatedLogo";
export type { AnimationName } from "./animations";

/** Dispatch a logo animation from anywhere in the app */
export function triggerLogoAnimation(name: "pulse" | "wiggle" | "bounce" | "spin" | "flip" | "float" | "slam") {
  document.dispatchEvent(new CustomEvent("logo:animate", { detail: name }));
}
