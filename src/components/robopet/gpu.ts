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
