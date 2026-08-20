/**
 * Stock exercise library.
 *
 * `pattern` groups exercises by movement (used for the pattern tag and the
 * Push/Pull/Legs/Core classifier). `cues` are the two or three things that
 * actually go wrong on that lift — not a full description, which nobody reads
 * between sets.
 *
 * Rest defaults follow load: heavy compounds 180s, secondary compounds 120s,
 * isolation 60-90s.
 */

export const PATTERN_LABELS = {
  squat: "Squat",
  hinge: "Hip hinge",
  "horizontal-push": "Horizontal press",
  "vertical-push": "Overhead press",
  "horizontal-pull": "Row",
  "vertical-pull": "Vertical pull",
  lunge: "Split stance",
  curl: "Elbow flexion",
  "tricep-extension": "Elbow extension",
  "lateral-raise": "Shoulder abduction",
  plank: "Isometric hold",
  crunch: "Trunk flexion",
  "hip-thrust": "Hip extension",
  "calf-raise": "Ankle extension",
};

const ex = (name, pattern, muscleGroups, sets, reps, restSeconds, cues, weightUnit = "KG") => ({
  name,
  pattern,
  muscleGroups,
  sets,
  reps,
  repsUnit: "Reps",
  weightUnit,
  restSeconds,
  cues,
});

export const EXERCISE_LIBRARY = [
  // ---------------- Squat pattern ----------------
  ex("Back Squat", "squat", ["Quads", "Glutes"], 3, "5", 180, [
    "Brace before you unrack, not after",
    "Knees track over mid-foot, don't cave",
    "Hips and shoulders rise together",
  ]),
  ex("Front Squat", "squat", ["Quads", "Core"], 3, "5", 180, [
    "Elbows high — a dropping elbow dumps the bar",
    "Stay upright; this is a quad lift",
  ]),
  ex("Goblet Squat", "squat", ["Quads", "Glutes"], 3, "10-12", 90, [
    "Elbows inside the knees at the bottom",
    "Sit between your heels, not behind them",
  ]),
  ex("Leg Press", "squat", ["Quads", "Glutes"], 3, "10-12", 120, [
    "Don't let your lower back round off the pad",
    "Stop just short of locking out",
  ]),
  ex("Hack Squat", "squat", ["Quads"], 3, "8-10", 150, [
    "Full depth beats more plates",
  ]),
  ex("Box Squat", "squat", ["Quads", "Glutes"], 3, "5", 180, [
    "Touch the box, don't collapse onto it",
  ]),

  // ---------------- Hinge ----------------
  ex("Deadlift", "hinge", ["Hamstrings", "Back", "Glutes"], 3, "5", 210, [
    "Bar against the shins before you pull",
    "Push the floor away; don't yank",
    "Lats tight to keep the bar close",
  ]),
  ex("Romanian Deadlift", "hinge", ["Hamstrings", "Glutes"], 3, "8-10", 150, [
    "Push the hips back, don't squat it down",
    "Stop where your hamstrings run out, not the floor",
  ]),
  ex("Sumo Deadlift", "hinge", ["Glutes", "Quads", "Back"], 3, "5", 210, [
    "Knees out over the toes from the start",
    "Hips closer to the bar than conventional",
  ]),
  ex("Trap Bar Deadlift", "hinge", ["Hamstrings", "Glutes", "Quads"], 3, "6-8", 180, [
    "Easier on the lower back — good default if pulling hurts",
  ]),
  ex("Good Morning", "hinge", ["Hamstrings", "Back"], 3, "8-10", 120, [
    "Light. This one punishes ego",
  ]),
  ex("Kettlebell Swing", "hinge", ["Glutes", "Hamstrings"], 3, "15", 90, [
    "It's a hinge, not a squat, and not a shoulder raise",
    "Snap the hips; the arms are rope",
  ]),
  ex("Back Extension", "hinge", ["Hamstrings", "Back", "Glutes"], 3, "12-15", 75, [
    "Squeeze the glutes at the top instead of hyperextending",
  ]),

  // ---------------- Horizontal push ----------------
  ex("Bench Press", "horizontal-push", ["Chest", "Triceps", "Shoulders"], 3, "5", 180, [
    "Shoulder blades pinned back and down",
    "Bar to the lower chest, not the throat",
    "Drive your feet into the floor",
  ]),
  ex("Incline Bench Press", "horizontal-push", ["Chest", "Shoulders"], 3, "8-10", 150, [
    "30-45 degrees; steeper turns it into a press",
  ]),
  ex("Dumbbell Bench Press", "horizontal-push", ["Chest", "Triceps"], 3, "8-12", 120, [
    "Longer range than a barbell — use it",
  ]),
  ex("Push-Up", "horizontal-push", ["Chest", "Triceps", "Core"], 3, "12-20", 60, [
    "Body in one line; no sagging hips",
    "Elbows at about 45 degrees, not flared",
  ], "Body Wt."),
  ex("Dip", "horizontal-push", ["Chest", "Triceps"], 3, "8-12", 120, [
    "Lean forward for chest, stay upright for triceps",
  ], "Body Wt."),
  ex("Cable Fly", "horizontal-push", ["Chest"], 3, "12-15", 75, [
    "Soft elbows, fixed angle — hug, don't press",
  ]),
  ex("Machine Chest Press", "horizontal-push", ["Chest", "Triceps"], 3, "10-12", 90, [
    "Set the seat so the handles line up with your mid-chest",
  ]),

  // ---------------- Vertical push ----------------
  ex("Overhead Press", "vertical-push", ["Shoulders", "Triceps"], 3, "5", 180, [
    "Squeeze the glutes so you don't press from a bent spine",
    "Head back out of the way, then through at the top",
  ]),
  ex("Seated Dumbbell Press", "vertical-push", ["Shoulders", "Triceps"], 3, "8-10", 120, [
    "Don't clank the dumbbells together at the top",
  ]),
  ex("Arnold Press", "vertical-push", ["Shoulders"], 3, "10-12", 90, [
    "Rotate as you press, smoothly",
  ]),
  ex("Landmine Press", "vertical-push", ["Shoulders", "Chest"], 3, "10-12", 90, [
    "Shoulder-friendly if overhead pressing bothers you",
  ]),
  ex("Pike Push-Up", "vertical-push", ["Shoulders", "Triceps"], 3, "8-12", 90, [
    "Hips high; the closer to vertical, the harder",
  ], "Body Wt."),

  // ---------------- Horizontal pull ----------------
  ex("Barbell Row", "horizontal-pull", ["Back", "Biceps"], 3, "8", 150, [
    "Torso stays put — if it rises with the bar, go lighter",
    "Pull to the bottom of the ribcage",
  ]),
  ex("Dumbbell Row", "horizontal-pull", ["Back", "Biceps"], 3, "10-12", 90, [
    "Drive the elbow back past your ribs",
    "Don't rotate the torso to cheat the last reps",
  ]),
  ex("Seated Cable Row", "horizontal-pull", ["Back", "Biceps"], 3, "10-12", 90, [
    "Chest up, shoulders down, no rowing with the lower back",
  ]),
  ex("Chest Supported Row", "horizontal-pull", ["Back"], 3, "10-12", 90, [
    "The pad removes the cheating — expect less weight",
  ]),
  ex("Face Pull", "horizontal-pull", ["Shoulders", "Back"], 3, "15-20", 60, [
    "Pull to the forehead, thumbs back",
    "The best insurance policy for a bench-heavy program",
  ]),
  ex("Inverted Row", "horizontal-pull", ["Back", "Biceps"], 3, "10-15", 90, [
    "Straight line from heels to head",
  ], "Body Wt."),

  // ---------------- Vertical pull ----------------
  ex("Pull-Up", "vertical-pull", ["Back", "Biceps"], 3, "6-10", 150, [
    "Start from a dead hang, shoulders engaged",
    "Chest to the bar, not chin over it",
  ], "Body Wt."),
  ex("Chin-Up", "vertical-pull", ["Back", "Biceps"], 3, "6-10", 150, [
    "Supinated grip; more biceps than a pull-up",
  ], "Body Wt."),
  ex("Lat Pulldown", "vertical-pull", ["Back", "Biceps"], 3, "10-12", 90, [
    "Pull to the collarbone; never behind the neck",
    "Lead with the elbows, not the hands",
  ]),
  ex("Straight Arm Pulldown", "vertical-pull", ["Back"], 3, "12-15", 60, [
    "Elbows locked — all lat, no biceps",
  ]),

  // ---------------- Split stance ----------------
  ex("Bulgarian Split Squat", "lunge", ["Quads", "Glutes"], 3, "8-10", 120, [
    "Front shin close to vertical for quads, leaned forward for glutes",
    "Brutal. Start with bodyweight",
  ]),
  ex("Walking Lunge", "lunge", ["Quads", "Glutes"], 3, "10-12", 90, [
    "Step long enough that the front knee stays behind the toes",
  ]),
  ex("Reverse Lunge", "lunge", ["Quads", "Glutes"], 3, "10-12", 90, [
    "Kinder on the knees than a forward lunge",
  ]),
  ex("Step-Up", "lunge", ["Quads", "Glutes"], 3, "10-12", 90, [
    "Drive through the top foot; don't push off the floor",
  ]),

  // ---------------- Elbow flexion ----------------
  ex("Barbell Curl", "curl", ["Biceps"], 3, "8-12", 75, [
    "Elbows pinned to your sides",
    "If your hips swing, it's too heavy",
  ]),
  ex("Dumbbell Curl", "curl", ["Biceps"], 3, "10-12", 60, [
    "Supinate as you lift — turn the pinky up",
  ]),
  ex("Hammer Curl", "curl", ["Biceps", "Back"], 3, "10-12", 60, [
    "Neutral grip; hits the brachialis",
  ]),
  ex("Incline Dumbbell Curl", "curl", ["Biceps"], 3, "10-12", 60, [
    "The stretched start is the whole point",
  ]),
  ex("Cable Curl", "curl", ["Biceps"], 3, "12-15", 60, [
    "Constant tension top to bottom",
  ]),
  ex("Preacher Curl", "curl", ["Biceps"], 3, "10-12", 60, [
    "No momentum available. Go lighter than you think",
  ]),

  // ---------------- Elbow extension ----------------
  ex("Tricep Pushdown", "tricep-extension", ["Triceps"], 3, "12-15", 60, [
    "Elbows still; only the forearms move",
  ]),
  ex("Overhead Tricep Extension", "tricep-extension", ["Triceps"], 3, "10-12", 75, [
    "The overhead stretch is where the long head grows",
  ]),
  ex("Skull Crusher", "tricep-extension", ["Triceps"], 3, "10-12", 75, [
    "Lower behind the forehead, not onto it",
  ]),
  ex("Close Grip Bench Press", "tricep-extension", ["Triceps", "Chest"], 3, "8-10", 120, [
    "Shoulder-width, not narrower — narrow grips wreck wrists",
  ]),
  ex("Tricep Kickback", "tricep-extension", ["Triceps"], 3, "12-15", 60, [
    "Upper arm parallel to the floor and locked there",
  ]),

  // ---------------- Shoulder abduction ----------------
  ex("Lateral Raise", "lateral-raise", ["Shoulders"], 3, "12-15", 60, [
    "Lead with the elbows, pinkies slightly up",
    "Stop at shoulder height",
  ]),
  ex("Cable Lateral Raise", "lateral-raise", ["Shoulders"], 3, "12-15", 60, [
    "Tension at the bottom, unlike dumbbells",
  ]),
  ex("Rear Delt Raise", "lateral-raise", ["Shoulders", "Back"], 3, "15", 60, [
    "Hinge over first, then raise out to the sides",
  ]),
  ex("Upright Row", "lateral-raise", ["Shoulders", "Back"], 3, "12-15", 75, [
    "Wide grip, stop at chest height if shoulders complain",
  ]),
  ex("Shrug", "lateral-raise", ["Shoulders", "Back"], 3, "12-15", 75, [
    "Straight up. Rolling them does nothing",
  ]),

  // ---------------- Hip extension ----------------
  ex("Hip Thrust", "hip-thrust", ["Glutes", "Hamstrings"], 3, "8-12", 120, [
    "Chin tucked, ribs down, finish with a glute squeeze",
    "Shins vertical at the top",
  ]),
  ex("Glute Bridge", "hip-thrust", ["Glutes"], 3, "15", 60, [
    "Push through the heels",
  ], "Body Wt."),
  ex("Cable Pull Through", "hip-thrust", ["Glutes", "Hamstrings"], 3, "12-15", 75, [
    "Hinge, then stand tall — don't lean back",
  ]),

  // ---------------- Knee flexion / extension ----------------
  ex("Leg Curl", "hip-thrust", ["Hamstrings"], 3, "10-12", 75, [
    "Control the way down; that's where the work is",
  ]),
  ex("Nordic Curl", "hip-thrust", ["Hamstrings"], 3, "5-8", 120, [
    "Lower as slowly as you can, catch yourself",
  ], "Body Wt."),
  ex("Leg Extension", "squat", ["Quads"], 3, "12-15", 75, [
    "Pause at the top for a second",
  ]),

  // ---------------- Calves ----------------
  ex("Standing Calf Raise", "calf-raise", ["Calves"], 4, "12-15", 60, [
    "Full stretch at the bottom, full squeeze at the top",
    "Don't bounce",
  ]),
  ex("Seated Calf Raise", "calf-raise", ["Calves"], 4, "15", 60, [
    "Bent knee shifts the work to the soleus",
  ]),

  // ---------------- Core ----------------
  ex("Plank", "plank", ["Core"], 3, "45", 60, [
    "Squeeze glutes and brace — a long sag isn't a long plank",
  ], "Body Wt."),
  ex("Side Plank", "plank", ["Core"], 3, "30", 45, [
    "Stack the hips, don't rotate",
  ], "Body Wt."),
  ex("Hanging Leg Raise", "crunch", ["Core"], 3, "10-15", 75, [
    "Curl the pelvis up; don't just swing the legs",
  ], "Body Wt."),
  ex("Crunch", "crunch", ["Core"], 3, "15-20", 45, [
    "Short range. It's a spine curl, not a sit-up",
  ], "Body Wt."),
  ex("Ab Wheel Rollout", "plank", ["Core"], 3, "8-12", 75, [
    "Ribs down the whole way; stop before your back arches",
  ], "Body Wt."),
  ex("Dead Bug", "crunch", ["Core"], 3, "10-12", 45, [
    "Lower back stays flat on the floor",
  ], "Body Wt."),
  ex("Cable Crunch", "crunch", ["Core"], 3, "12-15", 60, [
    "Flex the spine down; hips stay put",
  ]),
  ex("Farmer's Carry", "plank", ["Core", "Back"], 3, "40", 90, [
    "Tall posture, don't lean away from the load",
  ]),
];

/** Adjust the timed holds so they read as seconds, not reps. */
export const libraryEntry = (item) => {
  const timed = ["Plank", "Side Plank", "Farmer's Carry"].includes(item.name);
  return {
    sets: item.sets,
    reps: item.reps,
    repsUnit: timed ? "Secs" : "Reps",
    weight: "",
    weightUnit: item.weightUnit,
    isAlternative: false,
    altSets: [],
    muscleGroups: item.muscleGroups,
    restSeconds: item.restSeconds,
    pattern: item.pattern,
  };
};

/** Name -> library item, for pattern and cue lookups. */
export const LIBRARY_BY_NAME = EXERCISE_LIBRARY.reduce((acc, item) => {
  acc[item.name] = item;
  return acc;
}, {});

/**
 * Best-guess pattern for an exercise the library doesn't know, by matching
 * keywords in the name. Falls back to a neutral standing figure.
 */
export function guessPattern(name) {
  const known = LIBRARY_BY_NAME[name];
  if (known) return known.pattern;

  const n = (name || "").toLowerCase();
  const rules = [
    [/(squat|leg press|hack|leg extension)/, "squat"],
    [/(deadlift|romanian|rdl|good morning|swing|hinge|back extension)/, "hinge"],
    [/(bench|push-?up|pushup|fly|flye|dip|chest press)/, "horizontal-push"],
    [/(overhead press|ohp|shoulder press|military|arnold|landmine|pike)/, "vertical-push"],
    [/(row|face pull)/, "horizontal-pull"],
    [/(pull-?up|pullup|chin-?up|chinup|pulldown|pull down)/, "vertical-pull"],
    [/(lunge|split squat|step-?up)/, "lunge"],
    [/curl/, "curl"],
    [/(tricep|skull|pushdown|kickback|extension)/, "tricep-extension"],
    [/(lateral|raise|shrug|delt)/, "lateral-raise"],
    [/(plank|carry|hold|rollout)/, "plank"],
    [/(crunch|sit-?up|leg raise|dead bug|twist)/, "crunch"],
    [/(hip thrust|bridge|pull through|leg curl|nordic)/, "hip-thrust"],
    [/calf/, "calf-raise"],
  ];
  for (const [re, pattern] of rules) {
    if (re.test(n)) return pattern;
  }
  return "default";
}

const PUSH_PATTERNS = ["horizontal-push", "vertical-push", "tricep-extension", "lateral-raise"];
const PULL_PATTERNS = ["horizontal-pull", "vertical-pull", "curl"];
const LEG_PATTERNS = ["squat", "hinge", "lunge", "calf-raise", "hip-thrust"];
const CORE_PATTERNS = ["plank", "crunch"];

/** Push / Pull / Legs / Core, for the Library's filter chips. */
export function categoryFor(pattern) {
  if (PUSH_PATTERNS.includes(pattern)) return "Push";
  if (PULL_PATTERNS.includes(pattern)) return "Pull";
  if (LEG_PATTERNS.includes(pattern)) return "Legs";
  if (CORE_PATTERNS.includes(pattern)) return "Core";
  return "Push";
}

/** Barbell / Dumbbell / Cable / Machine / Bodyweight, for grouping the Library. */
export function equipmentFor(name, weightUnit) {
  const n = (name || "").toLowerCase();
  if (weightUnit === "Body Wt.") return "Bodyweight";
  if (/dumbbell|\bdb\b/.test(n)) return "Dumbbell";
  if (/cable/.test(n)) return "Cable";
  if (/(machine|leg press|hack squat|pulldown|leg curl|leg extension|chest press)/.test(n))
    return "Machine";
  if (/(barbell|deadlift|squat|bench press|overhead press|row|good morning|hip thrust)/.test(n))
    return "Barbell";
  return "Other";
}

export const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Other"];

/** The exercise's equipment: an explicit bank override, or the name-based guess. */
export function resolveEquipment(bankData, name) {
  return bankData?.equipment || equipmentFor(name, bankData?.weightUnit);
}
