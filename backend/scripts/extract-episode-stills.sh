#!/bin/bash

# Extract Episode Still Images
# This script extracts the first frame (at 1 second) from each episode video
# and saves them as PNG files for use as thumbnails and backgrounds.

INPUT_DIR="/Users/alexanderbarriga/Spanish_Lang_app/App_Final_Videos"
OUTPUT_DIR="/Users/alexanderbarriga/Spanish_Lang_app/mobile/assets/images/episode-stills"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Extracting still images from episode videos..."

for i in {1..8}; do
  INPUT_FILE="$INPUT_DIR/Episode_$i.mp4"
  OUTPUT_FILE="$OUTPUT_DIR/episode_${i}_still.png"
  
  if [ -f "$INPUT_FILE" ]; then
    echo "Extracting Episode $i..."
    ffmpeg -y -i "$INPUT_FILE" -ss 00:00:01 -vframes 1 -q:v 2 "$OUTPUT_FILE"
    
    if [ -f "$OUTPUT_FILE" ]; then
      echo "  ✓ Created: $OUTPUT_FILE"
    else
      echo "  ✗ Failed to create: $OUTPUT_FILE"
    fi
  else
    echo "  ✗ Input file not found: $INPUT_FILE"
  fi
done

echo ""
echo "Done! Still images saved to: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
