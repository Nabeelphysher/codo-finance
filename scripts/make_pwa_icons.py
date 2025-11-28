from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main() -> None:
    base_dir = Path(__file__).resolve().parents[1] / "public" / "icons"
    base_dir.mkdir(parents=True, exist_ok=True)
    colors = {192: (34, 133, 246), 512: (23, 28, 45)}

    for size, color in colors.items():
        image = Image.new("RGBA", (size, size), (*color, 255))
        draw = ImageDraw.Draw(image)
        label = "CA"
        font_size = int(size * 0.35)

        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except OSError:
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        draw.text(
            ((size - text_width) / 2, (size - text_height) / 2),
            label,
            fill=(255, 255, 255, 255),
            font=font,
        )

        output_file = base_dir / f"icon-{size}.png"
        image.save(output_file)
        print(f"created {output_file.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()

