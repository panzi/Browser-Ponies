#!/bin/sh

cd ponies-old || exit 1
find * -iname '*.ogg'|while read ogg; do
	echo "\"ponies-old/$ogg\" -> \"ponies/$ogg\""
	cp "$ogg" "../ponies/$ogg" || exit 1
done
