#!/bin/bash

# Youthful Male Styles
styles=("shortCurly" "shortFlat" "shortRound" "shortWaved" "theCaesar" "theCaesarAndSidePart")

# Casual Clothing
clothes=("graphicShirt" "hoodie" "overall" "shirtCrewNeck")

echo "Downloading Cute Boys..."
for i in {1..20}; do
   # Random selections
   style=${styles[$RANDOM % ${#styles[@]}]}
   cloth=${clothes[$RANDOM % ${#clothes[@]}]}
   
   # Construct URL with youthful parameters
   # accessoriesProbability=0 (No glasses)
   # facialHairProbability=0 (No beards)
   # mouth=smile (Happy)
   url="https://api.dicebear.com/7.x/avataaars/png?seed=boy_cute_$i&top=$style&clothing=$cloth&accessoriesProbability=0&facialHairProbability=0&mouth=smile"
   
   echo "Downloading boy_$i ($style / $cloth)..."
   curl -s "$url" -o "public/avatars/male/boy_$i.png"
done

echo "Done!"
