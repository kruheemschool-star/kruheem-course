
import cv2
import numpy as np
import os

def slice_sprites():
    # Load the image
    img_path = '/Users/kruheem/.gemini/antigravity/brain/6a4ea519-1578-4b0d-a489-8540392e27f0/monster_sheet_raw_1768961548486.png'
    output_dir = 'public/avatars/monster'
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    img = cv2.imread(img_path)
    if img is None:
        print(f"Error: Could not read image {img_path}")
        return

    # Convert to grayscale and threshold to find white background
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Invert threshold since objects are colorful on white
    # Threshold < 250 to consider it "not white"
    _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter small noise contours and sort by area (largest first)
    valid_contours = []
    for c in contours:
        area = cv2.contourArea(c)
        if area > 500: # Filter small specs
            valid_contours.append(c)
    
    # Sort contours by position (top-left to bottom-right) to keep order consistent
    # Calculate center of mass for sorting
    def get_contour_center(c):
        M = cv2.moments(c)
        if M["m00"] != 0:
            cX = int(M["m10"] / M["m00"])
            cY = int(M["m01"] / M["m00"])
            return cY, cX # Sort by Y (row) then X (col)
        return 0, 0

    valid_contours.sort(key=lambda c: (get_contour_center(c)[0] // 100, get_contour_center(c)[1]))

    print(f"Found {len(valid_contours)} distinct objects.")

    count = 0
    for i, c in enumerate(valid_contours):
        if count >= 20: 
            break
            
        x, y, w, h = cv2.boundingRect(c)
        
        # Add some padding
        pad = 10
        x = max(0, x - pad)
        y = max(0, y - pad)
        w = min(img.shape[1] - x, w + 2*pad)
        h = min(img.shape[0] - y, h + 2*pad)

        # Extract ROI
        roi = img[y:y+h, x:x+w]
        
        # Save
        filename = f"{output_dir}/monster_{count + 1}.png"
        cv2.imwrite(filename, roi)
        print(f"Saved {filename}")
        count += 1
    
    if count < 20:
        print(f"Warning: Only processed {count} monsters. Expected 20.")

if __name__ == "__main__":
    slice_sprites()
