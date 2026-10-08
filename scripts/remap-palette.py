"""One-off v5 (graphite/lime) -> v4 (ink/violet) palette remap.

Core tokens map explicitly to the v4 values; every other green-family tint keeps its
lightness/saturation but rotates hue into the ink (neutrals) or violet (accents) family,
so hand-tuned depth in illustrations survives the swap.
"""
import colorsys, re, sys, pathlib

EXPLICIT = {
    "101210": "07070c", "181c18": "0c0d16", "202620": "12141f", "353e33": "262b3f",
    "f0f2e9": "f4f2fa", "adb5a7": "9b98ad", "c8fa72": "a78bfa", "8ad6c2": "c4b5fd",
    "18210f": "0c0d16", "dcffab": "c4b5fd", "0f1110": "07070c",
}

def remap(hex6: str) -> str:
    if hex6 in EXPLICIT:
        return EXPLICIT[hex6]
    r, g, b = (int(hex6[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if not (45 <= deg <= 185) or s < 0.04:
        return hex6
    # Vivid tints become violet accents; muted ones become blue-leaning ink neutrals.
    if s > 0.45 and l > 0.35:
        h2, s2 = 258 / 360, min(1, s * 0.95)
    else:
        h2, s2 = 234 / 360, min(1, s * 1.1)
    r2, g2, b2 = colorsys.hls_to_rgb(h2, l, s2)
    return "".join(f"{round(c * 255):02x}" for c in (r2, g2, b2))

pattern = re.compile(r"#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b")
for path in sys.argv[1:]:
    p = pathlib.Path(path)
    text = p.read_text()
    new = pattern.sub(lambda m: "#" + remap(m.group(1).lower()) + (m.group(2) or ""), text)
    if new != text:
        p.write_text(new)
        print("updated", path)
