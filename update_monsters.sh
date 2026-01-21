#!/bin/bash

# Diverse seeds for visual variety (Cyclops, Fluffy, Multi-legged, etc.)
seeds=(
"cyclops" "fluffy" "tentacles" "blob" "yeti" 
"dragon" "alien" "bug" "beast" "critter"
"spikes" "horns" "wings" "tail" "scales"
"fuzzy" "googly" "chomp" "slurp" "zap"
)

echo "Downloading Monsters..."
for i in "${!seeds[@]}"; do
   seed=${seeds[$i]}
   index=$((i+1))
   # set=set2 (Monsters)
   # bgset=bg1 (Simple background or translucent if omitted, let's omit for transparent)
   # size=200x200
   url="https://robohash.org/$seed?set=set2&size=200x200"
   
   echo "Downloading monster_$index ($seed)..."
   curl -s "$url" -o "public/avatars/monster/monster_$index.png"
done

echo "Done!"
