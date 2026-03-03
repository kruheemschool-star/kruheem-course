import os
import shutil

# Source images
SOURCE_DIR = "/Users/kruheem/.gemini/antigravity/brain/169f313d-702e-46f9-aaa0-330911d4c0cc"
SOURCES = [
    "uploaded_image_0_1769012032904.png",
    "uploaded_image_1_1769012032904.png",
    "uploaded_image_2_1769012032904.png",
    "uploaded_image_3_1769012032904.png",
    "uploaded_image_4_1769012032904.png",
    "uploaded_image_0_1769012235878.png",
    "uploaded_image_1_1769012235878.png",
    "uploaded_image_2_1769012235878.png"
]

OUTPUT_DIR = "/Users/kruheem/Documents/kruheem-course/public/avatars/animals"

def update_avatars():
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Clear existing files
    print("Clearing existing animal avatars...")
    for filename in os.listdir(OUTPUT_DIR):
        file_path = os.path.join(OUTPUT_DIR, filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
                print(f"Deleted {filename}")
        except Exception as e:
            print(f"Error deleting {filename}: {e}")

    # 2. Copy new files
    print("Copying new avatars...")
    for i, src_filename in enumerate(SOURCES):
        src_path = os.path.join(SOURCE_DIR, src_filename)
        dest_filename = f"animal_{i+1}.png"
        dest_path = os.path.join(OUTPUT_DIR, dest_filename)
        
        try:
            shutil.copy2(src_path, dest_path)
            print(f"Copied {src_filename} to {dest_filename}")
        except FileNotFoundError:
            print(f"Error: Source file {src_filename} not found!")

    print("Avatar update complete.")

if __name__ == "__main__":
    update_avatars()
