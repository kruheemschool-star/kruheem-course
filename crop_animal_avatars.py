import os
import shutil
from PIL import Image

# Configuration
SOURCE_IMAGE_PATH = "/Users/kruheem/.gemini/antigravity/brain/169f313d-702e-46f9-aaa0-330911d4c0cc/uploaded_image_1769011607095.png"
OUTPUT_DIR = "/Users/kruheem/Documents/kruheem-course/public/avatars/animals"
ROWS = 2
COLS = 4

def crop_avatars():
    # Ensure output directory exists
    if os.path.exists(OUTPUT_DIR):
        # Remove all existing files in the directory
        for filename in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                    print(f"Deleted {filename}")
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')
    else:
        os.makedirs(OUTPUT_DIR)

    # Open the source image
    try:
        img = Image.open(SOURCE_IMAGE_PATH)
    except FileNotFoundError:
        print(f"Error: Source image not found at {SOURCE_IMAGE_PATH}")
        return

    # Calculate dimensions for each cell
    width, height = img.size
    cell_width = width // COLS
    cell_height = height // ROWS

    print(f"Image size: {width}x{height}")
    print(f"Cell size: {cell_width}x{cell_height}")

    # Crop and save images
    count = 1
    for row in range(ROWS):
        for col in range(COLS):
            left = col * cell_width
            top = row * cell_height
            right = left + cell_width
            bottom = top + cell_height

            # Crop the image
            avatar = img.crop((left, top, right, bottom))
            
            # Save the image
            filename = f"animal_{count}.png"
            output_path = os.path.join(OUTPUT_DIR, filename)
            avatar.save(output_path)
            print(f"Saved {filename}")
            count += 1
    
    print("Animal avatar generation complete.")

if __name__ == "__main__":
    crop_avatars()
