#!/bin/bash

rm -r merged
cp -r ponies merged
for pony in sounds/*; do
	pony=`basename "$pony"`
	if [ -e "merged/$pony" ]; then
		echo "merging $pony..."
		{ echo; cat "sounds/$pony/pony.ini"; } >> "merged/$pony/pony.ini"
		cp "sounds/$pony"/*.mp3 "sounds/$pony"/*.ogg "merged/$pony"
	else
		echo "sounds for $pony ignored" >&2
	fi
done
