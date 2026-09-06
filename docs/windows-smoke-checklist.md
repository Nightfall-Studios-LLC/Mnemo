# Windows packaged-app smoke checklist

Run this checklist against the optimized installer or executable produced by CI.

- Start with no Mnemo database and confirm the standard Java saves folder is discovered.
- Add an empty saves folder and a launcher instance using the native folder picker.
- Create, edit, rename, and remove a test world; confirm watcher-driven updates settle once.
- Add one local and one mounted-network destination, verify both, and make each the default.
- Back up a real world and confirm progress reports actual stages and bytes.
- Force one destination to fail, confirm a Partial snapshot, restore access, and retry its replica.
- Verify the archive, reveal it, and restore over an inactive world after a safety snapshot.
- Confirm an exclusively locked `session.lock` blocks restore.
- Remove a world, restore it to its original root, then restore it to a selected alternate root.
- Restart Mnemo and confirm roots, worlds, settings, destinations, history, and activity persist.
- Resize down to 900 x 600 and above 1200 x 720; confirm the existing Library layout remains usable.
- Run `npm run dev` in a browser and confirm the backend-unavailable state disables native actions.
