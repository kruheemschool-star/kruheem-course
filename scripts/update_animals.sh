#!/bin/bash

# Hex codes for 20 distinct animals (Twemoji)
# Rabbit, Duck, Cat, Dog, Chicken, Lion, Tiger, Cow, Elephant, Bear
# Snake, Dragon, Panda, Koala, Hamster, Fox, Monkey, Pig, Frog, Penguin
codes=(
"1f430" "1f986" "1f431" "1f436" "1f414" 
"1f981" "1f405" "1f42e" "1f418" "1f43b" 
"1f40d" "1f409" "1f43c" "1f428" "1f439" 
"1f98a" "1f435" "1f437" "1f438" "1f427"
)

echo "Downloading Animals..."
for i in "${!codes[@]}"; do
   code=${codes[$i]}
   index=$((i+1))
   url="https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/$code.svg"
   
   echo "Downloading animal_$index ($code)..."
   curl -s "$url" -o "public/avatars/animals/animal_$index.svg"
done

echo "Done!"
