#!/bin/bash
# Fetch og:image and related meta for batch-02 resorts
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
OUT="C:/Users/saita/ridewise/data/stage-25/raw"
mkdir -p "$OUT"

fetch() {
  local slug="$1"
  local url="$2"
  local suffix="$3"
  local out_file="$OUT/${slug}${suffix}.html"
  curl -s -L -A "$UA" --max-time 20 --max-filesize 5000000 "$url" -o "$out_file" 2>/dev/null
  local size=$(wc -c < "$out_file" 2>/dev/null)
  echo "$slug$suffix | $url | size=$size"
}

# slug | base_url
declare -A SITES=(
  [attitash]="https://www.attitash.com"
  [badger-pass]="https://www.travelyosemite.com/winter/yosemite-ski-snowboard-area/"
  [bear-basin-nordic-center]="https://payettelakesskiclub.org/pages/bear-basin-nordic-center"
  [bear-creek-mountain-resort]="https://www.bcmountainresort.com"
  [bear-mountain]="https://www.bigbearmountainresort.com"
  [bear-paw]="https://skibearpaw.com"
  [bear-valley-adventure-company]="https://www.bvadventures.com"
  [bear-valley-mountain]="https://www.bearvalley.com"
  [beartooth-basin]="https://www.beartoothbasin.com"
  [beaver-creek]="https://www.beavercreek.com"
  [beaver-mountain]="https://www.skithebeav.com"
  [beech-mountain-resort]="https://www.beechmountainresort.com"
  [belleayre-mountain]="https://www.belleayre.com"
  [berkshire-east]="https://berkshireeast.com"
  [bethel-village-trails]="https://woodsandtrails.org"
  [big-bear-pa]="https://www.ski-bigbear.com"
  [big-boulder]="https://www.jfbb.com"
  [big-powderhorn-mountain]="https://www.bigpowderhorn.net"
  [big-rock]="https://www.bigrockmaine.com"
  [big-sky]="https://www.bigskyresort.com"
  [big-snow-american-dream]="https://www.bigsnowamericandream.com"
  [big-squaw-mountain]="https://www.skibigsquaw.com"
  [bittersweet-ski-resort]="https://www.skibittersweet.com"
  [black-area]="https://www.blackmt.com"
  [black-mountain-of-maine]="https://www.skiblackmountain.org"
  [blackjack-mountain]="https://www.skiblackjack.com"
)

for slug in "${!SITES[@]}"; do
  fetch "$slug" "${SITES[$slug]}" ""
done
echo "DONE"
