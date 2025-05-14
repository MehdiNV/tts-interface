#!/bin/bash
# Change to the directory where this script is located.
cd "$(dirname "$0")" || exit

# Launch http-server bound to the IPv4 loopback.
# This assumes your project (including index.html) is in this directory.
npx http-server -a 127.0.0.1 -p 8080 &

# Wait briefly to give the server time to start.
sleep 1

# Open the website in the default browser.
open "http://127.0.0.1:8080"
