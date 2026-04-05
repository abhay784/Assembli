import path from "node:path";

export function assertPathsContainedInDir(paths: string[], dir: string): void {
  const resolvedDir = path.resolve(dir);
  const normalizedDir = path.normalize(resolvedDir);
  for (const p of paths) {
    const resolvedPath = path.resolve(p);
    const normalizedPath = path.normalize(resolvedPath);
    if (normalizedPath === normalizedDir) {
      continue;
    }
    const prefix = normalizedDir.endsWith(path.sep)
      ? normalizedDir
      : `${normalizedDir}${path.sep}`;
    if (!normalizedPath.startsWith(prefix)) {
      throw new Error(`Path escapes work directory: ${p}`);
    }
  }
}
