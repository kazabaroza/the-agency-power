#!/bin/bash
# מוציא פריימים מה-MP4 הסופי ומרכיב אותם לגיליונות בדיקה (4 פריימים בגיליון).
# שימוש: check.sh <video.mp4> <outdir> <t1> <t2> ...
set -e
V="$1"; S="$2"; shift 2
mkdir -p "$S"
i=0
for t in "$@"; do
  ffmpeg -loglevel error -y -ss "$t" -i "$V" -frames:v 1 -vf scale=540:960 "$S/f$(printf %02d $i).png"
  i=$((i+1))
done
k=0
while [ $((k*4+3)) -lt $i ]; do
  a=$((k*4))
  ffmpeg -loglevel error -y -i "$S/f$(printf %02d $a).png" -i "$S/f$(printf %02d $((a+1))).png" \
    -i "$S/f$(printf %02d $((a+2))).png" -i "$S/f$(printf %02d $((a+3))).png" \
    -filter_complex hstack=inputs=4 "$S/sheet$k.png"
  k=$((k+1))
done
echo "sheets: $k"
