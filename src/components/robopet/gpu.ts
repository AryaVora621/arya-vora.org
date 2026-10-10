// Chrome falls back to CPU rasterisers (SwiftShader, llvmpipe) on blocklisted GPUs and in
// headless runs. Shadow maps and PMREM on the CPU block the main thread for seconds, so
// the 3D scenes keep their static stills there instead.

// The renderer never changes during a visit, so it is read once and every scene reuses the
// answer.
let software: boolean | null = null;

/**
 * The renderer's name. Chromium and Safari report "WebKit WebGL" for RENDERER and keep the real
 * name behind the debug extension. Firefox reports the real name for RENDERER, and has deprecated
 * the extension (asking for it logs a warning), so the extension is asked for only when the plain
 * name is the masked one.
 */
function rendererName(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const plain = String(gl.getParameter(gl.RENDERER) ?? "");
  if (!/webkit webgl/i.test(plain)) return plain;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? plain) : plain;
}

export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  software ??= /swiftshader|llvmpipe|software|basic render/i.test(rendererName(gl));
  return software;
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
 * still at the top of the page instead of losing a screen of height mid-scroll. The probe is a
 * 1 by 1 canvas that is simply dropped: losing its context on purpose made Firefox log "WebGL
 * context was lost" on every page with a scene.
 */
export function prefersStill(): boolean {
  if (stillOnly !== null) return stillOnly;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    stillOnly = !gl || shouldUseStill(gl);
  } catch {
    stillOnly = true;
  }
  return stillOnly;
}
