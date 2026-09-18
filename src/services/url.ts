/** Build an in-app URL that works under both browser and hash routing. */
export function appUrl(path: string): string {
  return import.meta.env.VITE_ROUTER === 'hash' ? `${location.pathname}${location.search}#${path}` : path;
}
