#!/bin/bash

for pony in sounds/*; do
	echo "processing $pony..."
	for mp3 in "$pony"/*.mp3; do
		name="$pony/`basename "$mp3" .mp3`"
		ogg="$name.ogg"
		if [ ! -e "$ogg" ]; then
			wav="$name.wav"
			if [ ! -e "$wav" ]; then
				echo "converting $mp3 to wav..."
				ffmpeg -i "$mp3" "$wav" || exit 1
			fi
			echo "converting $wav to ogg..."
			oggenc -Q "$wav" -o "$ogg" || exit 1
			rm "$wav"
		fi
	done
	i=1
	for mp3 in "$pony"/*.mp3; do
		name=`basename "$mp3" .mp3`
		echo "Speak,\"Soundboard #$i\",\"$name\",{\"$name.mp3\",\"$name.ogg\"},False"
		i=$((i+1))	
	done > "$pony/pony.ini"
done
