from pptx import Presentation
from pptx.util import Inches
from pptx.dml.color import RGBColor
from PIL import Image
import os

# Folder containing your images
folder = r"F:\OneDrive\__CLSCC\2026-2027\20260907 - Opening Evening\export"

# Output file
output = os.path.join(folder, "OpeningEvening_python.pptx")

# Create presentation
prs = Presentation()

# Set slide size to 16:9 (optional, but recommended)
prs.slide_width = Inches(13.33)
prs.slide_height = Inches(7.5)

# Get all image files
valid_ext = (".jpg", ".jpeg", ".png", ".bmp")
images = [f for f in os.listdir(folder) if f.lower().endswith(valid_ext)]

for img_name in images:
    img_path = os.path.join(folder, img_name)

    # Open image to get dimensions
    with Image.open(img_path) as img:
        img_width, img_height = img.size

    # Create blank slide
    slide_layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(slide_layout)

    # Set background to black
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = RGBColor(0, 0, 0)

    # Slide dimensions (in pixels)
    slide_w = prs.slide_width
    slide_h = prs.slide_height

    # Compute scale to fit while preserving aspect ratio
    scale_w = slide_w / img_width
    scale_h = slide_h / img_height
    scale = min(scale_w, scale_h)

    # Final image size
    final_w = img_width * scale
    final_h = img_height * scale

    # Center the image
    left = (slide_w - final_w) / 2
    top = (slide_h - final_h) / 2

    # Add picture
    slide.shapes.add_picture(img_path, left, top, width=final_w, height=final_h)

# Save presentation
prs.save(output)

print("Presentation created at:", output)
