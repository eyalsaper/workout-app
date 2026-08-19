# Iron Log

Same app, same data, same Firebase database. One 1,899-line file is now 14 small
ones, so a change to (say) the day checklist means opening a 60-line file instead
of resending the whole app.

## Where things live

```
src/
├── App.js                        Navigation only — which screen is showing
├── firebase.js                   Config + database handle
│
├── lib/
│   ├── format.js                 Reps/weight formatting, set math, timer maths
│   └── audio.js                  The timer beep
│
├── hooks/
│   └── useFirebaseSync.js        Two-way sync between React state and one path
│
├── state/
│   └── WorkoutContext.jsx        ALL saved data + every way to change it
│
├── components/
│   ├── SetRow.jsx                One tappable set (used by two screens)
│   ├── ExerciseTimer.jsx         Countdown for timed sets
│   ├── ExerciseLabel.jsx         How an exercise reads in the weekly grid
│   ├── GlobalTracker.jsx         The daily habits list
│   └── ConfirmDialog.jsx         Are-you-sure modal
│
└── pages/
    ├── PlannerPage.jsx           The weekly grid
    ├── DayViewPage.jsx           Day checklist
    ├── ExerciseBankPage.jsx      The exercise bank table
    └── DetailPage.jsx            Notes, routine, files, links
```

**Rule of thumb for future changes:** anything about *what is saved* goes in
`WorkoutContext.jsx`. Anything about *how a screen looks* goes in its own file
under `pages/` or `components/`.

## Installing

Drop the `src/` folder into your project, replacing the old `App.js`. Your
`index.js`, `package.json`, and Tailwind setup are unchanged. Dependencies are
the same: `react`, `firebase`, `lucide-react`.

Nothing about the shape of the data changed, so your existing Firebase contents
load exactly as before.

## What changed behaviourally

Small, deliberate fixes that belonged to the code being moved:

- **Debounced writes.** Editing the bank used to write the entire bank object on
  every keystroke. Now it waits 400ms, and flushes immediately when the phone
  screen locks or the tab closes.
- **Notes are reachable on mobile.** The elaboration page opened on double-click
  or right-click — gestures a phone doesn't have. There's now a visible ⓘ button
  on every exercise in the grid.
- **The timer survives a locked screen.** It counts against a wall-clock deadline
  instead of decrementing on an interval that browsers throttle in the background.
- **The alarm should work on iPhone now.** One shared `AudioContext`, created when
  you tap Start (inside a user gesture, which iOS requires) rather than at zero.
- **Delete Plan** clears that plan's progress too, and can't produce a `NaN` plan id.
- **Day rows show `3/8 sets`** so you can see progress without opening the day.
- Set rows and tracker items are real `<button>`s — keyboard and screen-reader usable.

## Look and feel

The palette is taken from IPF calibrated competition plates, where colour
encodes weight — 25kg red, 20kg blue, 15kg yellow, 10kg green. Competition
yellow leads because it's the most legible against iron; **red is reserved for
personal records and destructive actions** so it never means two things at once.
Type is Saira Condensed for display, Archivo for body, Azeret Mono for numbers
and stencilled labels.

The signature element is the **three judges' lights**. In powerlifting, three
whites is a good lift: a completed set lights all three, and a set that beats
your estimated 1RM flashes them red.

Design tokens live in `src/index.css` under `@theme` (Tailwind v4). Change a
colour there and it propagates everywhere — there are no hardcoded hex values in
components except inside the SVG figures.

## Exercise library

71 stock exercises in `src/lib/exerciseLibrary.js`, each carrying muscle groups,
sets, rep range, rest time, a movement pattern and two or three form cues. The
Bank page offers to add any that are missing; **your own exercises are never
overwritten**.

### Form animations, not video

`components/ExerciseAnimation.jsx` draws a jointed figure and rotates its limbs
with CSS keyframes to loop the movement. There are 14 patterns — squat, hinge,
horizontal and vertical press, row, vertical pull, split stance, elbow flexion
and extension, shoulder abduction, hip extension, calf, plank and trunk flexion.

This is a deliberate tradeoff. It's drawn, not filmed, so it loads instantly,
works offline and carries no licensing question — but it shows the *pattern*, so
every pressing variation shares one animation. For lift-specific footage, use
the Links field on the exercise's page.

Exercises outside the library get a pattern guessed from their name
(`guessPattern`), falling back to a neutral standing figure.

## The training log

Sessions are now the source of truth. `users/{uid}/sessions/{date__plan-day}`
holds what you actually lifted:

```
{ date, planId, dayIndex, startedAt, finishedAt,
  entries: { "Bench Press": { sets: [{weight, weightUnit, reps, rpe, done, at}] } } }
```

Entries are keyed by **exercise name**, not index — so reordering or deleting an
exercise no longer moves your logged sets onto the wrong lift.

Because sessions are dated, the week resets itself. The **"New Week" button is
gone**, and the planner shows completion from the current week's sessions. Your
old `dailyProgress` node is left in the database untouched but unused.

### Session mode
Planner → **Start** on a day. One exercise at a time, oversized steppers,
and per set: weight, reps, RPE — pre-filled from the plan so an unchanged set is
one tap.

- **Last time** under each exercise: what you lifted and how long ago
- **Overload suggestion** — double progression: clear the top of the rep range on
  every set and it tells you to add 2.5kg (5lb); miss the floor and it says repeat
- **Rest timer** auto-starts on every logged set, counts to a wall-clock deadline,
  beeps and vibrates. Per-exercise rest is set in the Bank; 180s suits heavy compounds
- **Warm-up ladder** — 40/60/80% of your working weight, rounded to real plates.
  Shown, never logged. Skipped under 40kg
- **Screen stays awake** via the Wake Lock API. Needs Chrome/Android or Safari 16.4+;
  where unsupported the app says so instead of pretending

### Progress tab
- **History** — every session, newest first, with tonnage
- **Strength** — estimated 1RM per lift over time (Epley, honest to ~10 reps)
- **Volume** — working sets per muscle group this week vs last. Compounds split
  their credit across tagged groups rather than triple-counting. Untagged
  exercises are named so you know what's missing

Tag muscle groups by tapping an exercise name in the Bank. Set your bodyweight
on the Account page so bodyweight movements count toward volume.

## Deliberately NOT changed

These are the next jobs, left alone so this pass stays a pure restructure:

1. **Attachments still use `URL.createObjectURL`.** Those links die on refresh.
   Your project already has a `storageBucket` configured — Firebase Storage is
   the fix.
2. **Exercises are keyed by name**, so renaming one breaks every plan using it.
3. **The planner grid is still desktop-first.** Session mode is built for the
   phone; the weekly grid and Bank table are not.
4. **Check the Firebase database rules.** If they're still in test mode they're
   world-readable *and* they expire roughly 30 days after creation, at which
   point syncing silently stops.

## Running it locally

```bash
npm install
npm run dev
```

## Putting it on GitHub Pages

1. Create the repo and push (`main` branch).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on
   every push to `main`.

`vite.config.js` sets `base: "./"`, so the build works under any repo name
without editing anything.

## Accounts and security

The app now requires sign-in, and each account's data lives under
`users/{uid}/` in the database. Signing in on your phone and your laptop with
the same account gives you the same plans on both.

Relevant files: `state/AuthContext.jsx`, `components/SignInScreen.jsx`,
`pages/AccountPage.jsx`, `lib/migrate.js`.

### Setup, in this order

The order matters — step 5 blocks step 4.

1. **Firebase Console → Authentication → Sign-in method → enable Email/Password.**
   Nothing works before this. If you skip it, the app will tell you so.
2. `npm run dev`, then **Create an account**. Use a real email; the password is
   only for you.
3. You're now signed in with a fresh, empty plan. That's expected.
4. Go to the **shield tab → "Check for old data" → "Copy into my account."**
   This finds your existing workouts at the root of the database and copies them
   under your account. The originals are left alone, so you can retry it safely.
   Reload and confirm your plans are there.
5. **Lock the rules.** Copy them from the same page into Firebase Console →
   Realtime Database → Rules → Publish:

   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```

   From here on, the only way to read your data is to be signed in as you. If
   you lock these before step 4, the migration can't read the old root data —
   loosen them, migrate, lock again.

6. Once your data is confirmed migrated, delete the old root nodes in the
   Firebase Console (`exerciseBank`, `plans`, `dailyProgress`, `globalTracker`,
   `globalTrackerChecked`, `exerciseDetails`). The locked rules make them
   unreachable, but there's no reason to leave a stale copy lying around.

### On the Firebase config being public

Deploying to GitHub Pages puts your Firebase config into the published
JavaScript. That's normal and unavoidable — the config is a public identifier,
not a secret, and making the repo private changes nothing because the built
bundle is served publicly either way. The rules in step 5 are what protect you.

### Stopping other people creating accounts

Anyone who finds the site can create their own account. They can't touch your
data — the rules prevent it — they'd just get an empty app on your Firebase
quota. To close that off: Firebase Console → Authentication → Settings → User
actions → turn off account creation, after you've made your own account.
