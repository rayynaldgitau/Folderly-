"""
Generates high-resolution, cute Foldy mascot icons for Tauri and web.
Draws with 4x supersampling for ultra-crisp antialiasing.
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw

def create_foldy_canvas(size: int = 1024) -> Image.Image:
    # 4x supersampling
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = canvas_size / 64.0  # reference grid 64x64

    # Background gentle soft shadow
    shadow = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    # folder tab + body shape for shadow
    sdraw.rounded_rectangle([7 * s, 16 * s, 57 * s, 57 * s], radius=int(6 * s), fill=(255, 45, 135, 60))
    # Paste blurred/offset shadow if needed or just composite
    img.alpha_composite(shadow)

    # 1. Back Tab & Back Body
    # Draw back tab
    tab_box = [8 * s, 13 * s, 34 * s, 28 * s]
    draw.rounded_rectangle(tab_box, radius=int(5 * s), fill=(225, 30, 110, 255))
    back_body = [8 * s, 18 * s, 56 * s, 55 * s]
    draw.rounded_rectangle(back_body, radius=int(7 * s), fill=(215, 20, 100, 255))

    # 2. Main Folder Front Body with gradient effect
    front_left = int(6 * s)
    front_top = int(19 * s)
    front_right = int(58 * s)
    front_bottom = int(57 * s)
    radius = int(8 * s)

    # Render vertical gradient on front body
    front_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(front_img)
    fdraw.rounded_rectangle([front_left, front_top, front_right, front_bottom], radius=radius, fill=(255, 255, 255, 255))

    # Gradient mask
    for y in range(front_top, front_bottom + 1):
        ratio = (y - front_top) / max(1, (front_bottom - front_top))
        # from vibrant hot pink #ff65a3 (255, 101, 163) to deep rich magenta #e00067 (224, 0, 103)
        r = int(255 - ratio * 31)
        g = int(101 - ratio * 101)
        b = int(163 - ratio * 60)
        # Apply color line constrained to mask
        line_mask = Image.new("RGBA", (canvas_size, 1), (r, g, b, 255))
        # We can composite rows or just use standard color fill
    
    # Simpler and perfectly smooth: draw rounded rect with top highlight
    draw.rounded_rectangle([front_left, front_top, front_right, front_bottom], radius=radius, fill=(255, 45, 135, 255))

    # Top folder flap curve highlight
    highlight_box = [front_left + int(2 * s), front_top + int(1.5 * s), front_right - int(2 * s), front_top + int(11 * s)]
    draw.rounded_rectangle(highlight_box, radius=int(4 * s), fill=(255, 135, 185, 210))

    # 3. Rosy Cheek Blushes
    cheek_y = 42 * s
    cheek_rx = 4.2 * s
    cheek_ry = 2.6 * s
    draw.ellipse([19 * s - cheek_rx, cheek_y - cheek_ry, 19 * s + cheek_rx, cheek_y + cheek_ry], fill=(255, 135, 175, 220))
    draw.ellipse([45 * s - cheek_rx, cheek_y - cheek_ry, 45 * s + cheek_rx, cheek_y + cheek_ry], fill=(255, 135, 175, 220))

    # 4. Big Sparkling Anime Eyes
    eye_y = 36 * s
    eye_rx = 3.8 * s
    eye_ry = 4.8 * s
    # Left eye dark base
    draw.ellipse([23.5 * s - eye_rx, eye_y - eye_ry, 23.5 * s + eye_rx, eye_y + eye_ry], fill=(37, 9, 26, 255))
    # Right eye dark base
    draw.ellipse([40.5 * s - eye_rx, eye_y - eye_ry, 40.5 * s + eye_rx, eye_y + eye_ry], fill=(37, 9, 26, 255))

    # Main sparkle catchlights (large white highlight)
    draw.ellipse([22.2 * s - 1.6 * s, 34 * s - 1.6 * s, 22.2 * s + 1.6 * s, 34 * s + 1.6 * s], fill=(255, 255, 255, 255))
    draw.ellipse([39.2 * s - 1.6 * s, 34 * s - 1.6 * s, 39.2 * s + 1.6 * s, 34 * s + 1.6 * s], fill=(255, 255, 255, 255))

    # Secondary lower catchlights (small reflection)
    draw.ellipse([25 * s - 0.85 * s, 38 * s - 0.85 * s, 25 * s + 0.85 * s, 38 * s + 0.85 * s], fill=(255, 255, 255, 230))
    draw.ellipse([42 * s - 0.85 * s, 38 * s - 0.85 * s, 42 * s + 0.85 * s, 38 * s + 0.85 * s], fill=(255, 255, 255, 230))

    # 5. Joyful Cute Smile
    # Draw arc for smile
    smile_box = [29 * s, 38.5 * s, 35 * s, 42.5 * s]
    draw.arc(smile_box, start=10, end=170, fill=(44, 12, 32, 255), width=int(1.8 * s))
    # Tongue blush
    draw.arc([30.5 * s, 40.5 * s, 33.5 * s, 42.5 * s], start=10, end=170, fill=(255, 64, 129, 255), width=int(1.2 * s))

    # 6. Magical Sparkling Star (4-point star on top right)
    star_cx = 50 * s
    star_cy = 13.5 * s
    star_r1 = 3.5 * s
    star_r2 = 1.0 * s
    pts = []
    for i in range(8):
        angle = i * (math.pi / 4.0)
        dist = star_r1 if i % 2 == 0 else star_r2
        pts.append((star_cx + dist * math.sin(angle), star_cy - dist * math.cos(angle)))
    draw.polygon(pts, fill=(255, 229, 143, 255))
    draw.ellipse([star_cx - 0.8 * s, star_cy - 0.8 * s, star_cx + 0.8 * s, star_cy + 0.8 * s], fill=(255, 255, 255, 255))

    # Downsample using LANCZOS to final size
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    icons_dir = Path("src-tauri/icons")
    icons_dir.mkdir(parents=True, exist_ok=True)

    sizes = {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
        "app-icon.png": 512,
        "Square30x30Logo.png": 30,
        "Square44x44Logo.png": 44,
        "Square71x71Logo.png": 71,
        "Square89x89Logo.png": 89,
        "Square107x107Logo.png": 107,
        "Square142x142Logo.png": 142,
        "Square150x150Logo.png": 150,
        "Square284x284Logo.png": 284,
        "Square310x310Logo.png": 310,
        "StoreLogo.png": 50,
    }

    base_1024 = create_foldy_canvas(1024)

    for fname, sz in sizes.items():
        out_path = icons_dir / fname
        resized = base_1024.resize((sz, sz), Image.Resampling.LANCZOS)
        resized.save(out_path, format="PNG")
        print(f"Generated {fname} ({sz}x{sz})")

    # Generate multi-size icon.ico
    ico_path = icons_dir / "icon.ico"
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    base_1024.save(ico_path, format="ICO", sizes=ico_sizes)
    print("Generated icon.ico with sizes:", ico_sizes)

    # Also save public/favicon.png and public/vite.svg / favicon.ico
    public_dir = Path("public")
    public_dir.mkdir(parents=True, exist_ok=True)
    base_1024.resize((64, 64), Image.Resampling.LANCZOS).save(public_dir / "favicon.png", format="PNG")
    base_1024.resize((32, 32), Image.Resampling.LANCZOS).save(public_dir / "favicon.ico", format="ICO")
    print("Generated web favicons in public/")

if __name__ == "__main__":
    main()
