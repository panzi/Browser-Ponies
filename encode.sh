#!/bin/bash

wav="$1"

echo "encoding $wav..."
ffmpeg -i "$wav" "${wav%.wav}.mp3"
oggenc -Q "$wav"
