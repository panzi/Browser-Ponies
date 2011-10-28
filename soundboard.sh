#!/bin/bash

for pony in sounds/*; do
	echo "processing $pony..."
	i=1
	for mp3 in "$pony"/*.mp3; do
		text=`basename "$mp3" .mp3`
		echo "Speak,\"Soundboard #$i\",\"$text\",\"`basename "$mp3"`\",False"
		i=$((i+1))	
	done > "$pony/poni.ini"
done
