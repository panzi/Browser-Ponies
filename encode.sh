#!/bin/bash

find -L ponies -iname '*.mp3'|while read -r mp3; do
	ogg=${mp3%.mp3}.ogg
	if [ ! -f "$ogg" ]; then
		wav=${mp3%.mp3}-tmp-$$.wav
		echo "encoding $ogg"
		if ffmpeg -i "$mp3" "$wav" 2>/dev/null </dev/null; then
			if oggenc -Q "$wav" -o "$ogg"; then
				rm "$wav"
			else
				rm "$wav"
				exit 1
			fi
		else
			exit 1
		fi
	fi
done
