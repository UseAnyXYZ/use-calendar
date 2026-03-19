# @use-calendar/cli

Command-line interface for use-calendar.

## Usage

```bash
# Authenticate
use-calendar auth login --token <PAT>
use-calendar auth whoami

# Manage events
use-calendar events list [--from DATE] [--to DATE] [--json]
use-calendar events create --title "Meeting" [--start-time ISO] [--end-time ISO]
use-calendar events update <id> [--title "New Title"]
use-calendar events delete <id>

# Calendar feed
use-calendar calendar feed-url
```
