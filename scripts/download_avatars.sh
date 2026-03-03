#!/bin/bash

# Male Hairstyles (Short)
boys_styles=("shortCurly" "shortDreads1" "shortDreads2" "shortFlat" "shortRound" "shortWaved" "sides" "theCaesar" "theCaesarAndSidePart")

# Female Hairstyles (Long)
girls_styles=("bigHair" "bob" "bun" "curly" "curvy" "dreads" "frida" "fro" "froBand" "longButNotTooLong" "miaWallace" "shavedSides" "straight01" "straight02" "straightAndStrand")

echo "Downloading Boys..."
for i in {1..20}; do
   # Pick a random style
   style=${boys_styles[$RANDOM % ${#boys_styles[@]}]}
   url="https://api.dicebear.com/7.x/avataaars/png?seed=boy_seed_$i&top=$style&facialHairProbability=0"
   echo "Downloading boy_$i ($style)..."
   curl -s "$url" -o "public/avatars/male/boy_$i.png"
done

echo "Downloading Girls..."
for i in {1..20}; do
   # Pick a random style
   style=${girls_styles[$RANDOM % ${#girls_styles[@]}]}
   url="https://api.dicebear.com/7.x/avataaars/png?seed=girl_seed_$i&top=$style&facialHairProbability=0"
   echo "Downloading girl_$i ($style)..."
   curl -s "$url" -o "public/avatars/female/girl_$i.png"
done

echo "Done!"
