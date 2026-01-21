import os
import shutil

# Source images
SOURCE_DIR = "/Users/kruheem/.gemini/antigravity/brain/169f313d-702e-46f9-aaa0-330911d4c0cc"
SOURCES = [
    "uploaded_image_0_1769012861758.png",
    "uploaded_image_1_1769012861758.png",
    "uploaded_image_2_1769012861758.png",
    "uploaded_image_3_1769012861758.png",
    "uploaded_image_0_1769013110045.png",
    "uploaded_image_1_1769013110045.png",
    "uploaded_image_2_1769013110045.png",
    "uploaded_image_3_1769013110045.png"
]

OUTPUT_DIR = "/Users/kruheem/Documents/kruheem-course/public/avatars/monsters"

def add_monsters():
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Copy new files
    print("Copying monster avatars...")
    for i, src_filename in enumerate(SOURCES):
        src_path = os.path.join(SOURCE_DIR, src_filename)
        dest_filename = f"monster_{i+1}.png"
        dest_path = os.path.join(OUTPUT_DIR, dest_filename)
        
        try:
            shutil.copy2(src_path, dest_path)
            print(f"Copied {src_filename} to {dest_filename}")
        except FileNotFoundError:
            print(f"Error: Source file {src_filename} not found!")

    print("Monster avatar update complete.")

if __name__ == "__main__":
    add_monsters()
