"use client";

import { useEffect } from "react";

const SCENE_SELECTOR = "[data-motion-scene]";

/**
 * Enables the landing's scroll story without a scroll listener. Every scene is
 * visible by default; the motion class is added only after hydration, so Safari
 * and users with JavaScript disabled never lose content.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scenes = Array.from(document.querySelectorAll<HTMLElement>(SCENE_SELECTOR));

    const revealAll = () => {
      scenes.forEach((scene) => scene.classList.add("motion-in-view"));
    };

    if (reducedMotion.matches) {
      revealAll();
      return;
    }

    root.classList.add("landing-motion-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("motion-in-view");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12%", threshold: 0.16 },
    );

    scenes.forEach((scene) => observer.observe(scene));

    return () => {
      root.classList.remove("landing-motion-ready");
      observer.disconnect();
    };
  }, []);

  return null;
}
