#!/bin/bash

# Youthful/Cute Girl Styles
styles=("bob" "bun" "curly" "curvy" "dreads" "fro" "froBand" "longButNotTooLong" "miaWallace" "shavedSides" "straight01" "straight02" "straightAndStrand")

# Casual Clothing
clothes=("graphicShirt" "hoodie" "overall" "shirtCrewNeck" "shirtScoopNeck")

echo "Downloading Cute Girls..."
for i in {1..20}; do
   # Random selections
   style=${styles[$RANDOM % ${#styles[@]}]}
   cloth=${clothes[$RANDOM % ${#clothes[@]}]}
   
   # Construct URL with youthful parameters
   # accessoriesProbability=0 (No glasses)
   # mouth=smile (Happy)
   url="https://api.dicebear.com/7.x/avataaars/png?seed=girl_cute_$i&top=$style&clothing=$cloth&accessoriesProbability=0&facialHairProbability=0&mouth=smile"
   
   echo "Downloading girl_$i ($style / $cloth)..."
   curl -s "$url" -o "public/avatars/female/girl_$i.png"
done

echo "Done!"
