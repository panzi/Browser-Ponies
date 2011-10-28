#!/bin/bash

for pony in sounds/*; do
	echo "processing $pony..."
	for mp3 in "$pony"/*.mp3; do
		ogg="$pony/`basename "$mp3" .mp3`.ogg"
		if [ ! -e "$ogg" ]; then
			echo "converting $mp3 to ogg..."
			ffmpeg -i "$mp3" "$ogg" > /dev/null || exit 1
		fi
	done
	i=1
	for mp3 in "$pony"/*.mp3; do
		text=`basename "$mp3" .mp3`
		echo "Speak,\"Soundboard #$i\",\"$text\",\"`basename "$mp3"`\",False"
		i=$((i+1))	
	done > "$pony/poni.ini"
done
