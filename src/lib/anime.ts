import type { MutableRefObject } from "react";

// Lightweight animation helper inspired by anime.js for offline environments.
// Supports the small subset of features required by the MavPath UI.
// This allows us to keep the declarative anime-style API while bundling no
// external dependencies when network access is restricted.

export type AnimeEasing = "linear" | "easeOutQuad" | "easeOutExpo";

type NumericValue = number | [number, number];

type AnimeTarget =
  | Element
  | Element[]
  | NodeListOf<Element>
  | MutableRefObject<Element | null>;

interface AnimeParams {
  targets: AnimeTarget;
  translateX?: NumericValue;
  translateY?: NumericValue;
  width?: NumericValue;
  opacity?: NumericValue;
  duration?: number;
  delay?: number;
  easing?: AnimeEasing;
  complete?: () => void;
}

interface ResolvedRange {
  from: number;
  to: number;
}

interface ElementAnimationConfig {
  element: Element;
  translateX?: ResolvedRange;
  translateY?: ResolvedRange;
  width?: ResolvedRange;
  opacity?: ResolvedRange;
}

const ANIME_DATA_KEY = {
  x: "animeTranslateX",
  y: "animeTranslateY",
};

const easeMap: Record<AnimeEasing, (t: number) => number> = {
  linear: (t) => t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

const resolveTargets = (target: AnimeTarget): Element[] => {
  if (
    (target as MutableRefObject<Element | null>)?.current instanceof Element
  ) {
    return [(target as MutableRefObject<Element | null>).current!];
  }

  if (target instanceof Element) {
    return [target];
  }

  if (target instanceof NodeList) {
    return Array.from(target);
  }

  if (Array.isArray(target)) {
    return target as Element[];
  }

  return [];
};

const parseTransformMatrix = (transform: string): { x: number; y: number } => {
  if (!transform || transform === "none") {
    return { x: 0, y: 0 };
  }

  if (transform.startsWith("matrix(")) {
    const values = transform
      .replace("matrix(", "")
      .replace(")", "")
      .split(",")
      .map((v) => Number.parseFloat(v.trim()));

    return {
      x: values[4] ?? 0,
      y: values[5] ?? 0,
    };
  }

  if (transform.startsWith("matrix3d(")) {
    const values = transform
      .replace("matrix3d(", "")
      .replace(")", "")
      .split(",")
      .map((v) => Number.parseFloat(v.trim()));

    return {
      x: values[12] ?? 0,
      y: values[13] ?? 0,
    };
  }

  return { x: 0, y: 0 };
};

const getCurrentTranslate = (element: Element, axis: "x" | "y"): number => {
  const datasetKey = ANIME_DATA_KEY[axis] as keyof DOMStringMap;
  const datasetValue = (element as HTMLElement).dataset?.[datasetKey];
  if (datasetValue !== undefined) {
    return Number.parseFloat(datasetValue);
  }

  const { x, y } = parseTransformMatrix(getComputedStyle(element).transform);
  return axis === "x" ? x : y;
};

const getCurrentWidth = (element: Element): number => {
  const rect = (element as HTMLElement).getBoundingClientRect();
  if (rect.width) {
    return rect.width;
  }

  const computed = getComputedStyle(element);
  const width = Number.parseFloat(computed.width);
  return Number.isNaN(width) ? rect.width : width;
};

const getCurrentOpacity = (element: Element): number => {
  const opacity = Number.parseFloat(getComputedStyle(element).opacity);
  return Number.isNaN(opacity) ? 1 : opacity;
};

const resolveRange = (
  value: NumericValue | undefined,
  current: number
): ResolvedRange | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const [from, to] = value;
    return { from, to };
  }

  return { from: current, to: value };
};

const prepareAnimations = (params: AnimeParams): ElementAnimationConfig[] => {
  const targets = resolveTargets(params.targets);

  return targets.map((element) => {
    const translateX = resolveRange(
      params.translateX,
      getCurrentTranslate(element, "x")
    );
    const translateY = resolveRange(
      params.translateY,
      getCurrentTranslate(element, "y")
    );
    const width = resolveRange(params.width, getCurrentWidth(element));
    const opacity = resolveRange(params.opacity, getCurrentOpacity(element));

    return {
      element,
      translateX,
      translateY,
      width,
      opacity,
    };
  });
};

const applyTransform = (element: HTMLElement, x: number, y: number) => {
  element.dataset[ANIME_DATA_KEY.x as keyof DOMStringMap] = x.toString();
  element.dataset[ANIME_DATA_KEY.y as keyof DOMStringMap] = y.toString();
  element.style.transform = `translate(${x}px, ${y}px)`;
};

const animate = (config: ElementAnimationConfig[], params: AnimeParams) => {
  const duration = params.duration ?? 400;
  const delay = params.delay ?? 0;
  const easing = easeMap[params.easing ?? "easeOutQuad"];
  const startTime = performance.now() + delay;

  const initialTransforms = new WeakMap<Element, { x: number; y: number }>();

  config.forEach(({ element, translateX, translateY }) => {
    if (!(element instanceof HTMLElement)) return;
    const x = translateX?.from ?? getCurrentTranslate(element, "x");
    const y = translateY?.from ?? getCurrentTranslate(element, "y");
    initialTransforms.set(element, { x, y });
    applyTransform(element, x, y);
  });

  const step = (now: number) => {
    if (now < startTime) {
      requestAnimationFrame(step);
      return;
    }

    const elapsed = Math.min((now - startTime) / duration, 1);
    const eased = easing(elapsed);

    config.forEach(({ element, translateX, translateY, width, opacity }) => {
      if (!(element instanceof HTMLElement)) return;
      const transform = initialTransforms.get(element) ?? { x: 0, y: 0 };
      const nextX = translateX
        ? translateX.from + (translateX.to - translateX.from) * eased
        : transform.x;
      const nextY = translateY
        ? translateY.from + (translateY.to - translateY.from) * eased
        : transform.y;

      applyTransform(element, nextX, nextY);

      if (width) {
        const value = width.from + (width.to - width.from) * eased;
        element.style.width = `${value}px`;
      }

      if (opacity) {
        const value = opacity.from + (opacity.to - opacity.from) * eased;
        element.style.opacity = value.toString();
      }
    });

    if (elapsed < 1) {
      requestAnimationFrame(step);
    } else if (typeof params.complete === "function") {
      params.complete();
    }
  };

  requestAnimationFrame(step);
};

const anime = (params: AnimeParams) => {
  const configs = prepareAnimations(params);
  if (!configs.length) return;
  animate(configs, params);
};

export default anime;
