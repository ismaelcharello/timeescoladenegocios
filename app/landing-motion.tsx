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

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".product-stage");
    const query = stage?.querySelector<HTMLElement>(".motion-search-query");
    if (!stage || !query) return;

    const fullText = query.textContent ?? "";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      stage.classList.add("demo-results-in");
      return;
    }

    // Demonstração em laço: digita a busca, mostra os resultados, apaga e recomeça.
    // Só roda com o painel visível e a aba em primeiro plano.
    stage.classList.add("demo-results-in");
    let timer = 0;
    let running = false;
    let visible = false;
    let index = 0;

    const later = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };

    const step = () => {
      if (!running) return;
      if (index === 0) stage.classList.remove("demo-results-in");
      if (index < fullText.length) {
        index += 1;
        query.textContent = fullText.slice(0, index);
        later(step, 34);
        return;
      }
      later(() => {
        stage.classList.add("demo-results-in");
        later(() => {
          stage.classList.remove("demo-results-in");
          later(() => {
            index = 0;
            query.textContent = "";
            later(step, 500);
          }, 400);
        }, 5200);
      }, 450);
    };

    const sync = () => {
      const shouldRun = visible && document.visibilityState === "visible";
      if (shouldRun && !running) {
        running = true;
        index = 0;
        query.textContent = "";
        later(step, 700);
      } else if (!shouldRun && running) {
        running = false;
        window.clearTimeout(timer);
        query.textContent = fullText;
        stage.classList.add("demo-results-in");
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        sync();
      },
      { threshold: 0.35 },
    );
    observer.observe(stage);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      query.textContent = fullText;
    };
  }, []);

  return null;
}
