#!/bin/bash
source ~/.bashrc 2>/dev/null
export SUPABASE_URL="$LEARN_SUPABASE_URL"
export SUPABASE_SERVICE_ROLE_KEY="$LEARN_SUPABASE_SERVICE_ROLE_KEY"
exec node "$(dirname "$0")/dist/index.js"
