/**
 * URL path for a file under remotion/public/, matching what Remotion's staticFile()
 * produces in the browser (window.remotion_staticBase is "/public" in bundled HTML).
 * In Node there is no window — staticFile() would wrongly omit the "/public" prefix.
 */
export function publicStaticFileUrl(relativePathInsidePublicFolder: string): string {
  const trimmed = relativePathInsidePublicFolder.replace(/^\/+/, "");
  const encoded = trimmed
    .split("/")
    .filter((s) => s.length > 0)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/public/${encoded}`;
}
