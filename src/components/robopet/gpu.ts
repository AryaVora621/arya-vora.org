// Chrome falls back to CPU rasterisers (SwiftShader, llvmpipe) on blocklisted GPUs and in
// headless runs. Drawing the model there makes every drag frame slow, so the figure keeps its
// static still instead.
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
  return /swiftshader|llvmpipe|software|basic render/i.test(name);
}

/** `?force3d` lets headless review captures exercise the live model anyway. */
export function shouldUseStill(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  return isSoftwareRenderer(gl) && !new URLSearchParams(location.search).has("force3d");
}

/**
 * Ask a throwaway canvas whether the live model would run here, before three.js (about 150 KB
 * compressed) is downloaded. False when WebGL is missing or the renderer is a software one.
 */
export function canRunLiveModel() {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return false;
    const still = shouldUseStill(gl);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !still;
  } catch {
    return false;
  }
}
