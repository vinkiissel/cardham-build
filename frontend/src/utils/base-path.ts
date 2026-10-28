import {
  navigate as browserNavigate,
  useBrowserLocation,
} from "wouter/use-browser-location";

/**
 * Path prefix the app is served from, without a trailing slash.
 * Empty when the app is served from the root, e.g. "/arkham.build" on GitHub Pages.
 * Configured with Vite's `base` option (`VITE_BASE_PATH` in `vite.config.ts`).
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Prefixes a root-relative path, e.g. "/card/01001", with the base path.
 */
export function withBasePath(path: string) {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) {
    return path;
  }

  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;

  return `${BASE_PATH}${path}`;
}

function stripBasePath(pathname: string) {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";

  return pathname.startsWith(`${BASE_PATH}/`)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
}

type NavigateOptions = Parameters<typeof browserNavigate>[1];

/**
 * Browser location hook for wouter that hides the base path from the app.
 * Routes, links and `~/` paths are written as if the app was served from the root.
 */
export function useBasePathLocation(): [
  string,
  (to: string, options?: NavigateOptions) => void,
] {
  const [pathname] = useBrowserLocation();

  return [
    stripBasePath(pathname),
    (to, options) => browserNavigate(withBasePath(to), options),
  ];
}

useBasePathLocation.hrefs = (href: string) => withBasePath(href);
