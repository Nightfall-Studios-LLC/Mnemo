# Game definitions

Game definitions are community-editable data describing how Mnemo can identify a game and find
its saves. The schema is experimental and may change before a stable release.

JSON is used initially because Qt can parse it without another dependency. A future migration to
YAML can be considered if comments and authoring ergonomics justify a maintained dependency.

```json
{
  "schema_version": 1,
  "id": "example-game",
  "name": "Example Game",
  "platforms": {
    "windows": {
      "save_groups": [
        {
          "id": "default",
          "label": "Saves",
          "paths": ["%USERPROFILE%/Saved Games/Example Game"]
        }
      ]
    }
  },
  "launchers": {
    "steam": { "app_id": "000000" }
  }
}
```

The model is intentionally `Game → Save Group / Profile / World → files`. A game is not assumed
to have one indivisible directory. Definitions may later describe separate characters, worlds,
profiles, campaigns, or slots and the files belonging to each.

Definitions must not contain executable code, secrets, backup policy, or provider details. Path
expansion and validation belong to the loader. Contributions should be small data-only pull
requests with the game, launcher, OS, source of the path information, and save structure tested.

