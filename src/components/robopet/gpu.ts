// Chrome falls back to CPU rasterisers (SwiftShader, llvmpipe) on blocklisted GPUs and in
// headless runs. Shadow maps and PMREM on the CPU block the main thread for seconds, so
// the 3D scenes keep their static stills there instead.
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(
    gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "",
  );
  return /swiftshader|llvmpipe|software|basic render/i.test(name);
}

/** `?force3d` lets headless review captures exercise the live scenes anyway. */
export function shouldUseStill(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  return isSoftwareRenderer(gl) && !new URLSearchParams(location.search).has("force3d");
}

let stillOnly: boolean | null = null;

/**
 * Whether this browser gets the stills (no WebGL, or a software renderer without
 * `?force3d`), probed once with a throwaway context and cached. The exploded view reads it
 * at first render, so a still-only browser settles on the static layout while the visitor is
 * still at the top of the page instead of losing a screen of height mid-scroll.
 */
export function prefersStill(): boolean {
  if (stillOnly !== null) return stillOnly;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    stillOnly = !gl || shouldUseStill(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    stillOnly = true;
  }
  return stillOnly;
}
