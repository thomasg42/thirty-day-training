export const preStartTasks = [
  { id: 'ps-1', milestone: 'In-person meeting conducted', description: 'Face-to-face onboarding meeting completed with new hire.' },
  { id: 'ps-2', milestone: 'Welcome conversation done', description: 'Welcome to the Noodles & Company family!' },
  { id: 'ps-3', milestone: 'Lead + Hiring Manager both say YES – file double-checked', description: 'Both Lead and Hiring Manager confirm – all paperwork verified.', highlightWord: 'YES' },
  { id: 'ps-4', milestone: 'Two forms of ID verified', description: 'Government-issued identification confirmed on file.' },
  { id: 'ps-5', milestone: 'Clocked in for the first time', description: 'First official clock-in recorded in the system.' },
  { id: 'ps-6', milestone: 'Noodles shirt issued', description: 'Official Noodles & Company uniform shirt provided.' },
  { id: 'ps-7', milestone: 'Noodles hat issued', description: 'Official Noodles & Company hat provided.' },
  { id: 'ps-8', milestone: 'Written onto schedule (future shifts confirmed)', description: 'Employee has been added to upcoming shift schedule.' },
  { id: 'ps-9', milestone: 'Corporate Front of House Training Videos – Started & Completed', description: 'All FOH corporate training videos watched and acknowledged.', buttons: [{ type: 'video', label: 'FOH Videos' }] },
  { id: 'ps-10', milestone: 'Corporate Back of House Training Videos – Started & Completed', description: 'All BOH corporate training videos watched and acknowledged.', buttons: [{ type: 'video', label: 'BOH Videos' }] },
];

export const phase1Tasks = [
  { id: 'p1-1', day: 1, milestone: 'Silver Bowl', description: 'Learn the Silver Bowl station – setup, portions, and flow.', buttons: [
    { type: 'video', label: 'Video 1', key: 'p1-1' },
    { type: 'video', label: 'Video 2', key: 'p1-1-2' },
    { type: 'video', label: 'Video 3', key: 'p1-1-3' },
  ], policyUrlKey: 'policy-silver-bowl' },
  { id: 'p1-2', day: 2, milestone: 'Silver Bowl / Salad Bar', description: 'Add Salad Bar to the rotation and maintain both stations.', buttons: [
    { type: 'video', label: 'Salad Bar – Video 1', key: 'p1-2' },
    { type: 'video', label: 'Salad Bar – Video 2', key: 'p1-2-2' },
  ], policyUrlKey: 'policy-salad-bar' },
  { id: 'p1-3', day: 3, milestone: 'Silver Bowl / Salad Bar / Sauté', description: 'Intro to Sauté. Observe and shadow experienced team members.', buttons: [
    { type: 'video', label: 'Sauté – Video 1', key: 'p1-3' },
    { type: 'video', label: 'Sauté – Video 2', key: 'p1-3-2' },
    { type: 'video', label: 'Sauté – Video 3', key: 'p1-3-3' },
  ], policyUrlKey: 'policy-saute' },
  { id: 'p1-4', day: 4, milestone: "The Basics: Flip, Clean, Do's & Don'ts", description: 'Master foundational Sauté movements and food safety.', buttons: [{ type: 'video', label: 'Video', key: 'p1-4' }], policyUrlKey: 'policy-saute' },
  { id: 'p1-5', day: 5, milestone: 'Sauté: Non-Busy Hours', description: 'Run Sauté solo during slow periods. Know every dish.', buttons: [{ type: 'video', label: 'Video', key: 'p1-5' }], policyUrlKey: 'policy-saute' },
  { id: 'p1-6', day: 6, milestone: 'Push Yourself – Ask for Help When Overwhelmed', description: 'Run Sauté in real-time. Communicate early when overwhelmed.', policyUrlKey: 'policy-saute' },
  { id: 'p1-7', day: 7, milestone: 'Push More – Learn to Close Sauté', description: 'Handle higher volume. Know full closing procedure.', policyUrlKey: 'policy-saute' },
  { id: 'p1-8', day: 8, milestone: 'Sauté Mastered', description: 'Sauté locked in. Full routine, can close, ticket times under 5 min.', badges: ['mastery'], highlight: 'gold', buttons: [
    { type: 'video', label: 'Expo – Video 1', key: 'p1-8-1' },
    { type: 'video', label: 'Expo – Video 2', key: 'p1-8-2' },
    { type: 'video', label: 'Expo – Video 3', key: 'p1-8-3' },
    { type: 'video', label: 'Expo – Video 4', key: 'p1-8-4' },
  ], policyUrlKey: 'policy-saute' },
];

export const phase2Tasks = [
  { id: 'p2-1', day: 9, milestone: 'Grill: Know All Cook Times', description: 'Memorize every protein cook time – no hesitation.', buttons: [
    { type: 'video', label: 'Grill – Video 1', key: 'p2-1' },
    { type: 'video', label: 'Grill – Video 2', key: 'p2-1-2' },
    { type: 'video', label: 'Grill – Video 3', key: 'p2-1-3' },
    { type: 'video', label: 'Grill – Video 4', key: 'p2-1-4' },
  ], policyUrlKey: 'policy-grill' },
  { id: 'p2-2', day: 10, milestone: 'Never Run Out of Proteins', description: 'Always two steps ahead – if running low, already fired more.', buttons: [{ type: 'image', label: 'Schematic' }], policyUrlKey: 'policy-grill' },
  { id: 'p2-3', day: 11, milestone: 'Know Noodle Side Like a Pro', description: 'Every dish has a weight. Learn them all – no guessing.', buttons: [
    { type: 'video', label: 'Noodle – Video 1', key: 'p2-3-1' },
    { type: 'video', label: 'Noodle – Video 2', key: 'p2-3-2' },
    { type: 'video', label: 'Noodle – Video 3', key: 'p2-3-3' },
    { type: 'video', label: 'Noodle – Video 4', key: 'p2-3-4' },
    { type: 'video', label: 'Noodle – Video 5', key: 'p2-3-5' },
    { type: 'video', label: 'Noodle – Video 6', key: 'p2-3-6' },
    { type: 'video', label: 'Noodle – Video 7', key: 'p2-3-7' },
  ], policyUrlKey: 'policy-noodles' },
  { id: 'p2-4', day: 12, milestone: 'Never Run Out of Sauce', description: 'Learn sauce rotation – anticipate usage, never fall behind.', policyUrlKey: 'policy-noodles' },
  { id: 'p2-5', day: 13, milestone: 'Every Dish is Hot / Know All Garnishes', description: 'Food leaves hot every single time. Know every garnish by heart.', policyUrlKey: 'policy-noodles' },
  { id: 'p2-6', day: 14, milestone: 'Get Through the Rush', description: 'Run Noodle at full speed during peak hours. No bottlenecks.', badges: ['timed'], policyUrlKey: 'policy-noodles' },
  { id: 'p2-7', day: 15, milestone: 'Noodle Mastered', description: 'Noodle on lock. Know how to close. Ticket times under 5 min.', badges: ['mastery'], highlight: 'gold', buttons: [
    { type: 'video', label: 'Expo – Video 1', key: 'p2-7-1' },
    { type: 'video', label: 'Expo – Video 2', key: 'p2-7-2' },
    { type: 'video', label: 'Expo – Video 3', key: 'p2-7-3' },
    { type: 'video', label: 'Expo – Video 4', key: 'p2-7-4' },
  ], policyUrlKey: 'policy-noodles' },
];

export const phase3Tasks = [
  { id: 'p3-1', day: 16, milestone: 'Hold Down the Line: Slow Times', description: 'Own your station. No one needs to check on you.' },
  { id: 'p3-2', day: 17, milestone: 'No Call-Outs / No Schedule Changes', description: 'Show up, on time, every shift. Reliability is everything.' },
  { id: 'p3-3', day: 18, milestone: 'All Dish Weights Memorized', description: 'No cheat sheets. Every weight from memory.', hasManagerSignOff: true },
  { id: 'p3-4', day: 19, milestone: 'Always Running Dishes When Dropped', description: 'Dish pit awareness – food moves the moment it drops.', hasManagerSignOff: true },
  { id: 'p3-5', day: 20, milestone: 'All Garnishes Memorized', description: 'Zero hesitation, zero misses on every garnish.' },
  { id: 'p3-6', day: 21, milestone: 'No Drama', description: 'Keep energy clean. Be someone the team is glad to work with.' },
  { id: 'p3-7', day: 22, milestone: 'Know How to Do All Produce', description: 'Know what to cut, how to cut it, and when to do it.' },
  { id: 'p3-8', day: 23, milestone: 'Stay Later If Necessary', description: 'Team-first mindset. When the restaurant needs you, you show up.' },
];

export const phase4Tasks = [
  { id: 'p4-1', day: 24, milestone: 'Own Your Station – No Prompting', description: 'You see it, you do it. No one tells you what\'s next.', hasManagerSignOff: true },
  { id: 'p4-2', day: 25, milestone: 'Dish Pit Mastered', description: 'Dish pit runs clean and efficient. Nothing piles up.', hasManagerSignOff: true },
  { id: 'p4-3', day: 26, milestone: 'Produce Ownership – See It Before They Tell You', description: 'Know what\'s running low before a manager says a word.', hasManagerSignOff: true },
  { id: 'p4-4', day: 27, milestone: 'Full Empowerment – Handle Any Task', description: 'Any task thrown at you gets handled. No hesitation.', hasManagerSignOff: true },
  { id: 'p4-5', day: 28, milestone: 'Culture Fit – You Blend In, You Belong', description: 'Not a needle in a haystack. You\'re part of the team.', hasManagerSignOff: true },
  { id: 'p4-6', day: 29, milestone: 'Everything on Automation – Zero Wasted Motion', description: 'Every move is intentional and efficient. You just run.', hasManagerSignOff: true },
  { id: 'p4-7', day: 30, milestone: 'Graduation Day', description: '30 days. Every box checked. Every station owned. Welcome to the team.', hasManagerSignOff: true, badges: ['day30'], highlight: 'red' },
];

export const POLICY_TASK_IDS = [
  'policy-cv-read',
  'policy-cv-sign',
  'policy-wc-read',
  'policy-wc-sign',
  'policy-att-read',
  'policy-att-sign',
  'policy-video',
];

export const POLICY2_TASK_IDS = [
  'pp2-food-safety',
  'pp2-customer-interaction',
  'pp2-team-communication',
];

export const phase5Tasks = [
  { id: 'ph5-1', milestone: 'Front of House (FOH)', description: 'Learn the front of house layout, stations, and your role as part of the FOH team.', buttons: [
    { type: 'video', label: 'Register – Video 1', key: 'ph5-1-1' },
    { type: 'video', label: 'Register – Video 2', key: 'ph5-1-2' },
    { type: 'video', label: 'Register – Video 3', key: 'ph5-1-3' },
  ], policyUrlKey: 'policy-foh' },
  { id: 'ph5-2', milestone: 'Ambassador Role', description: 'Understand the Ambassador station – how to greet, guide, and serve guests at the front.', policyUrlKey: 'policy-ambassador', buttons: [
    { type: 'video', label: 'Ambassador – Video 1', key: 'ph5-2-1' },
    { type: 'video', label: 'Ambassador – Video 2', key: 'ph5-2-2' },
    { type: 'video', label: 'Ambassador – Video 3', key: 'ph5-2-3' },
    { type: 'video', label: 'Ambassador – Video 4', key: 'ph5-2-4' },
    { type: 'video', label: 'Ambassador – Video 5', key: 'ph5-2-5' },
    { type: 'video', label: 'Ambassador – Video 6', key: 'ph5-2-6' },
  ] },
  { id: 'ph5-3', milestone: 'Accuracy Specialist', description: 'Master the Accuracy Specialist role – every order checked before it leaves the line.', policyUrlKey: 'policy-accuracy', buttons: [
    { type: 'video', label: 'Accuracy Specialist – Video 1', key: 'ph5-3-1' },
    { type: 'video', label: 'Accuracy Specialist – Video 2', key: 'ph5-3-2' },
    { type: 'video', label: 'Accuracy Specialist – Video 3', key: 'ph5-3-3' },
    { type: 'video', label: 'Accuracy Specialist – Video 4', key: 'ph5-3-4' },
    { type: 'video', label: 'Accuracy Specialist – Video 5', key: 'ph5-3-5' },
    { type: 'video', label: 'Accuracy Specialist – Video 6', key: 'ph5-3-6' },
    { type: 'video', label: 'Accuracy Specialist – Video 7', key: 'ph5-3-7' },
    { type: 'video', label: 'Accuracy Specialist – Video 8', key: 'ph5-3-8' },
    { type: 'video', label: 'Accuracy Specialist – Video 9', key: 'ph5-3-9' },
  ] },
  { id: 'ph5-dm', milestone: 'Drink Machine – Maintain, Clean & Change Cartridges', description: 'Learn how to maintain, clean, and change out the Coke machine cartridges.', buttons: [
    { type: 'video', label: 'Drink Machine – Video 1', key: 'ph5-dm-1' },
    { type: 'video', label: 'Drink Machine – Video 2', key: 'ph5-dm-2' },
    { type: 'video', label: 'Drink Machine – Video 3', key: 'ph5-dm-3' },
    { type: 'video', label: 'Drink Machine – Video 4', key: 'ph5-dm-4' },
    { type: 'video', label: 'Drink Machine – Video 5', key: 'ph5-dm-5' },
    { type: 'video', label: 'Drink Machine – Video 6', key: 'ph5-dm-6' },
  ] },
  { id: 'ph5-4', milestone: 'Dish Pit', description: 'Run the dish pit efficiently – nothing piles up, everything moves.', buttons: [
    { type: 'video', label: 'Dish Pit – Video 1', key: 'ph5-4-1' },
    { type: 'video', label: 'Dish Pit – Video 2', key: 'ph5-4-2' },
    { type: 'video', label: 'Dish Pit – Video 3', key: 'ph5-4-3' },
    { type: 'video', label: 'Dish Pit – Video 4', key: 'ph5-4-4' },
    { type: 'video', label: 'Dish Pit – Video 5', key: 'ph5-4-5' },
  ], policyUrlKey: 'policy-dish-pit' },
  { id: 'ph5-5', milestone: 'Opening Procedures', description: 'Know the full opening checklist – restaurant is ready before the doors open.', buttons: [{ type: 'video', label: '▶ Watch: How to Open the Restaurant' }], policyUrlKey: 'policy-opening' },
  { id: 'ph5-6', milestone: 'Closing Procedures', description: 'Own the close – every station clean, stocked, and signed off before you leave.', buttons: [{ type: 'video', label: '▶ Watch: How to Close the Restaurant' }], policyUrlKey: 'policy-closing' },
  { id: 'ph5-7', milestone: 'Prep Procedures', description: 'Learn the full prep flow – what to cut, how to measure, when to do it.', buttons: [{ type: 'video', label: '▶ Watch: Prep – Start to Finish' }], policyUrlKey: 'policy-prep' },
  { id: 'ph5-rk-1', milestone: 'How to Make Rice Krispies', description: 'Rice Krispie Procedures', buttons: [{ type: 'video', label: 'How to Make Rice Krispies', key: 'ph5-rk-1' }] },
  { id: 'ph5-rk-2', milestone: 'How to Cut Rice Krispies', description: 'Rice Krispie Procedures', buttons: [{ type: 'video', label: 'How to Cut Rice Krispies', key: 'ph5-rk-2' }] },
  { id: 'ph5-rk-3', milestone: 'How to Wrap Rice Krispies', description: 'Rice Krispie Procedures', buttons: [{ type: 'video', label: 'How to Wrap Rice Krispies', key: 'ph5-rk-3' }] },
];

export const ALL_TASKS = [...preStartTasks, ...phase1Tasks, ...phase2Tasks, ...phase3Tasks, ...phase4Tasks, ...phase5Tasks];

export const DAY_TASKS = ALL_TASKS.filter(t => t.day != null);

export function buildEmptyState() {
  const checked = {};
  const initials = {};
  const managerSignOffs = {};
  ALL_TASKS.forEach(t => {
    checked[t.id] = false;
    initials[t.id] = '';
    if (t.hasManagerSignOff) managerSignOffs[t.id] = '';
  });
  // Add policy pack task IDs
  POLICY_TASK_IDS.forEach(id => { checked[id] = false; });
  POLICY2_TASK_IDS.forEach(id => { checked[id] = false; });
  return { checked, initials, managerSignOffs };
}

export function countCompletedDays(checkedMap) {
  const mainCount = ALL_TASKS.filter(t => checkedMap?.[t.id]).length;
  const policyCount = POLICY_TASK_IDS.filter(id => checkedMap?.[id]).length;
  const policy2Count = POLICY2_TASK_IDS.filter(id => checkedMap?.[id]).length;
  return mainCount + policyCount + policy2Count;
}

export const TOTAL_TASKS = ALL_TASKS.length + POLICY_TASK_IDS.length + POLICY2_TASK_IDS.length;

export function getLastActivity(checkedMap) {
  const completed = DAY_TASKS.filter(t => checkedMap?.[t.id]);
  if (completed.length === 0) return null;
  const last = completed[completed.length - 1];
  return `Day ${last.day} – ${last.milestone}`;
}

/* ---------------------------------------------------------------------------
   Everything below was added during the Base44 -> GitHub Pages rebuild.
   The task arrays above are the verbatim curriculum extracted from Base44.

   Policy-pack labels: only the *_TASK_IDS arrays survived the Base44 export
   (the components that rendered their labels were never captured). The labels
   here are reconstructed from the IDs and are editable in Admin -> Curriculum,
   so correct them in-app rather than editing this file.
--------------------------------------------------------------------------- */

export const policyPack = {
  title: 'Policy Pack — Read & Sign',
  items: [
    { id: 'policy-cv-read', label: 'Core Values — read in full', kind: 'read' },
    { id: 'policy-cv-sign', label: 'Core Values — signed', kind: 'sign', signKey: 'core_values' },
    { id: 'policy-wc-read', label: 'Workplace Conduct — read in full', kind: 'read' },
    { id: 'policy-wc-sign', label: 'Workplace Conduct — signed', kind: 'sign', signKey: 'workplace_conduct' },
    { id: 'policy-att-read', label: 'Attendance Policy — read in full', kind: 'read' },
    { id: 'policy-att-sign', label: 'Attendance Policy — signed', kind: 'sign', signKey: 'attendance' },
    { id: 'policy-video', label: 'Policy overview video watched end to end', kind: 'video', videoKey: 'policy-video' },
  ],
};

export const policyPack2 = {
  title: 'Standards Acknowledgement',
  items: [
    { id: 'pp2-food-safety', label: 'Food safety standards understood', kind: 'read' },
    { id: 'pp2-customer-interaction', label: 'Guest interaction standards understood', kind: 'read' },
    { id: 'pp2-team-communication', label: 'Team communication standards understood', kind: 'read' },
  ],
};

/**
 * Kitchen walkthrough. In the Base44 build these sat above Phase 1 and Phase 2
 * as reference media rather than milestones, so they render as links only and
 * deliberately do NOT count toward the 61 checkable tasks.
 */
export const kitchenWalkthrough = [
  { key: 'kitchen-1', label: 'Walkthrough 1', type: 'video' },
  { key: 'kitchen-2', label: 'Walkthrough 2', type: 'video' },
  { key: 'kitchen-3', label: 'Walkthrough 3', type: 'video' },
  { key: 'policy-kitchen', label: 'Kitchen policy doc', type: 'doc' },
];

/** Ordered render plan for the whole check sheet. */
export const PHASES = [
  {
    key: 'pre-start',
    title: 'Pre-Start',
    subtitle: 'Before day one',
    tone: 'slate',
    tasks: preStartTasks,
  },
  {
    key: 'policy',
    title: policyPack.title,
    subtitle: 'Read and sign each policy',
    tone: 'slate',
    policyItems: policyPack.items,
  },
  {
    key: 'kitchen',
    title: 'Welcome to the Kitchen',
    subtitle: 'Walkthrough — watch before Phase 1',
    tone: 'slate',
    mediaOnly: true,
    media: kitchenWalkthrough,
  },
  {
    key: 'phase-1',
    title: 'Phase 1 — Sauté',
    subtitle: 'Days 1–8',
    tone: 'gold',
    tasks: phase1Tasks,
  },
  {
    key: 'phase-2',
    title: 'Phase 2 — Grill & Noodle',
    subtitle: 'Days 9–15',
    tone: 'gold',
    tasks: phase2Tasks,
  },
  {
    key: 'phase-3',
    title: 'Phase 3 — Hold the Line',
    subtitle: 'Days 16–23',
    tone: 'blue',
    tasks: phase3Tasks,
  },
  {
    key: 'phase-4',
    title: 'Phase 4 — Full Ownership',
    subtitle: 'Days 24–30',
    tone: 'red',
    tasks: phase4Tasks,
  },
  {
    key: 'phase-5',
    title: 'Stations & Procedures',
    subtitle: 'Learn alongside the 30 days',
    tone: 'slate',
    tasks: phase5Tasks,
  },
  {
    key: 'standards',
    title: policyPack2.title,
    subtitle: 'Final acknowledgement',
    tone: 'slate',
    policyItems: policyPack2.items,
  },
];

/** The welcome block shown at the top of the sheet, before Pre-Start. */
export const WELCOME_MEDIA_KEY = 'welcome-video';

/** Every media key referenced by a task button, in render order. */
export function collectMediaKeys() {
  const keys = [
    { key: WELCOME_MEDIA_KEY, label: 'Welcome video', type: 'video', taskId: 'welcome', milestone: 'Welcome block (top of sheet)' },
    ...kitchenWalkthrough.map((item) => ({ ...item, taskId: 'kitchen', milestone: 'Welcome to the Kitchen' })),
  ];
  ALL_TASKS.forEach((task) => {
    (task.buttons || []).forEach((button, index) => {
      const key = button.key || `${task.id}-b${index}`;
      keys.push({ key, label: button.label, type: button.type, taskId: task.id, milestone: task.milestone });
    });
    if (task.policyUrlKey && !keys.some((entry) => entry.key === task.policyUrlKey)) {
      keys.push({ key: task.policyUrlKey, label: `${task.milestone} — reference doc`, type: 'doc', taskId: task.id, milestone: task.milestone });
    }
  });
  [...policyPack.items, ...policyPack2.items].forEach((item) => {
    if (item.videoKey) keys.push({ key: item.videoKey, label: item.label, type: 'video', taskId: item.id, milestone: item.label });
  });
  return keys;
}

/** Task lookup by id, including policy-pack pseudo-tasks. */
export const TASK_BY_ID = (() => {
  const map = new Map();
  ALL_TASKS.forEach((task) => map.set(task.id, task));
  [...policyPack.items, ...policyPack2.items].forEach((item) => map.set(item.id, item));
  return map;
})();

export const SIGNATURE_BLOCKS = [
  { key: 'employee', label: 'Employee signature' },
  { key: 'trainer', label: 'Trainer signature' },
  { key: 'manager', label: 'General Manager signature' },
];
