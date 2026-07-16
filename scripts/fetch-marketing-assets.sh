#!/usr/bin/env bash
# Download the trbpayoutsystem.us reference assets into public/marketing/.
# Idempotent: re-running overwrites. Run from repo root: bash scripts/fetch-marketing-assets.sh
set -u
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
DEST="public/marketing"
mkdir -p "$DEST/testimonials"

dl() { # url dest
  curl -fsSL -A "$UA" "$1" -o "$2" && echo "ok   $2 ($(wc -c < "$2") bytes)" || echo "FAIL $2 <- $1"
}

BASE="https://trbpayoutsystem.us"
FRONT="$BASE/public/front/assets/img"

dl "$BASE/admin/assets/images/logo.svg"        "$DEST/logo.svg"
dl "$FRONT/american_flag.png"                  "$DEST/american_flag.png"
dl "$FRONT/customer_care_rep_2.png"            "$DEST/customer_care_rep_2.png"
dl "$FRONT/project_card_1.jpg"                 "$DEST/project_card_1.jpg"
dl "$FRONT/project_card_2.jpg"                 "$DEST/project_card_2.jpg"
dl "$FRONT/project_card_3.jpg"                 "$DEST/project_card_3.jpg"
dl "$FRONT/testimonial/testi_2_1.png"          "$DEST/testimonials/testi_2_1.png"
dl "$FRONT/testimonial/testi_2_2.png"          "$DEST/testimonials/testi_2_2.png"
dl "$FRONT/testimonial/testi_2_3.png"          "$DEST/testimonials/testi_2_3.png"
dl "$FRONT/testimonial/testi_2_4.png"          "$DEST/testimonials/testi_2_4.png"
dl "$FRONT/trump_custom.jpg"                   "$DEST/trump_custom.jpg"
dl "$BASE/assets/img/trumpvid.MP4"             "$DEST/trumpvid.mp4"
dl "https://res.cloudinary.com/dy66rqkhi/video/upload/v1780819053/gemini_generated_video_45538E8F_vkgbbe.mp4" "$DEST/hero-bg.mp4"
dl "https://res.cloudinary.com/dy66rqkhi/image/upload/v1740927705/1739502621-e01_h4d6i2.png" "$DEST/stats-bg.png"

echo "--- done ---"; ls -la "$DEST" "$DEST/testimonials"
