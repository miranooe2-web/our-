import type { CoupleData } from "./types";

/**
 * ─────────────────────────────────────────────────────────────
 *  DEFAULT CONTENT
 *  Everything here is placeholder data so the app works out of
 *  the box. You don't need to touch this file — open the Admin
 *  tab (default PIN: 1234) to edit names, dates, photos, notes,
 *  messages and voice notes from inside the app.
 * ─────────────────────────────────────────────────────────────
 */

export const DEFAULT_DATA: CoupleData = {
  version: 1,

  myName: "Ava",
  partnerName: "Noah",

  // ✏️ Relationship dates — edit in Admin → "Relationship details".
  startDate: "2023-03-04",
  anniversaryDate: "2023-03-04",

  // Hero photo on the countdown card (null → soft gradient).
  heroImage: null,

  // Daily love-note reminder time (24h, "HH:MM").
  dailyTime: "09:00",

  // Rotates daily (index = day-of-year ÷ length). Add as many as you like.
  dailyMessages: [
    "Every day with you feels like my favorite chapter. Today's page starts with gratitude — for you.",
    "I don't always say it out loud, but you make the ordinary days feel like events. Thank you for being mine.",
    "Somewhere between your laugh and my favorite song, I figured it out: it's you. It was always going to be you.",
    "Today I chose you — again, on purpose, with my whole heart. Just like every day before.",
    "If I could send you something through this screen, it would be a hug. The long, quiet kind. You're welcome.",
    "We don't need grand gestures. I love you in the small things — the good mornings, the shared glances, the 9 a.m. texts.",
    "The world is loud today. Remember: you are my favorite quiet place.",
    "I keep a mental photo album of you — mid-laugh, mid-thought, mid-everything. Today's favorite: you, right now.",
    "Whatever today throws at us, we'll do it side by side. That's the deal, and I never renegotiate.",
    "You are my person. Not 'a' person — the one. Just a happy little reminder day.",
    "I hope today gives you at least three moments that make you smile. I'll be the fourth.",
    "Love note: you don't have to earn my heart today. It's yours by default, renewed every single morning.",
    "If our story were a movie, today would be one of the scenes worth pausing on. I'm pausing on you.",
    "No reason, no occasion. Just you, me, and today. That's enough. It has always been enough.",
  ],

  emotions: [
    {
      id: "e-happy",
      label: "Happy",
      icon: "sun",
      tint: "amber",
      note:
        "So good for you.\n\nWhen you're happy, I'm happy — it's basically a reflex by now. I love watching you light up, and I love that I get to be the reason more often than not.\n\nSo smile big today. You've earned it, and I'm cheering from wherever I am. (Also: tell me what made you smile. I want every detail.)",
    },
    {
      id: "e-sad",
      label: "Sad",
      icon: "cloudRain",
      tint: "sky",
      note:
        "Come here.\n\nYou don't have to explain it, fix it, or perform being okay. You're allowed to feel this, and I'm allowed to just sit in it with you.\n\nCry if you need to — I'll hold the umbrella. Talk if you want to — I'm listening. Go quiet if you need to — I'm staying. Either way, you are not alone in this.",
    },
    {
      id: "e-missing",
      label: "Missing you",
      icon: "doubleHearts",
      tint: "rose",
      note:
        "I miss you more.\n\nThe worst part about missing you is that I can feel you in the small things — your song on the radio, your name in the back of my mind, the empty side of the bed.\n\nDistance is just a temporary inconvenience. You are my permanent address. Count down the hours with me.",
    },
    {
      id: "e-anxious",
      label: "Anxious",
      icon: "wind",
      tint: "violet",
      note:
        "Breathe with me.\n\nAnxiety lies. It tells you the worst possible version of tomorrow, and somehow you believe it.\n\nSo let's outsmart it: take four slow breaths with me — in for four, hold for four, out for six. Now here's the truth — you have never once been as helpless as your brain claims. You've got a whole team (me) on your side. One hour at a time.",
    },
    {
      id: "e-stressed",
      label: "Stressed",
      icon: "storm",
      tint: "slate",
      note:
        "Unplug for me.\n\nWhen everything feels heavy, it's not a character flaw — it's overload. Here's my prescription: drink some water, step outside for five minutes, and put the phone face down.\n\nWhatever feels urgent can wait one hour. Whatever isn't can wait all day. I've got your back, so you can set the weight down for a bit. We'll handle it together — and 'together' is a magic word.",
    },
    {
      id: "e-sleep",
      label: "Can't sleep",
      icon: "moon",
      tint: "indigo",
      note:
        "Welcome to the 3 a.m. club.\n\nThe 3 a.m. thoughts are the loudest and the least reliable. If your mind won't switch off: dim the light, put the phone down, and focus on your body — shoulders down, jaw unclenched, one long breath.\n\nAnd if it's me you can't stop thinking about… well, you're stuck with me. Sweet dreams, my favorite insomniac.",
    },
    {
      id: "e-excited",
      label: "Excited",
      icon: "sparkle",
      tint: "peach",
      note:
        "YES. Tell me everything.\n\nThis is my favorite kind of energy and I am a hundred percent here for it. The best days start exactly like this — buzzing, full of possibility, a little giddy.\n\nSo go enjoy it. And when the story has a good part (and it will), I want every single detail. Celebration pending.",
    },
  ],

  memories: [
    {
      id: "m-coffee",
      title: "The First Coffee",
      location: "Little café on 5th street",
      dateLabel: "March 2023",
      image: null,
      motif: "coffee",
      letter:
        "We were supposed to meet for twenty minutes. It took four hours, three refills, and a very patient barista.\n\nI still remember the exact moment I knew — you finished my sentence before I could, and I thought: oh no. Oh, absolutely no.\n\nI've been yours ever since.",
    },
    {
      id: "m-road",
      title: "Road Trip to the Coast",
      location: "Big Sur overlook",
      dateLabel: "July 2023",
      image: null,
      motif: "road",
      letter:
        "We played our playlist on repeat, argued about absolutely nothing, and stopped at every single 'nice view' sign.\n\nAt that overlook, you looked at the ocean, then at me, and said 'this is the life.'\n\nI thought: yes. And I meant the ocean — but mostly I meant you.",
    },
    {
      id: "m-ring",
      title: "The Proposal",
      location: "Where it all started",
      dateLabel: "June 2025",
      image: null,
      motif: "ring",
      letter:
        "Back at the same café, in the same corner, you asked me to be yours for all of it — the good days, the long days, the boring ones and the best ones.\n\nI said yes before you finished the sentence. (You did that again. I never stop loving that about you.)",
    },
    {
      id: "m-home",
      title: "Our Little Home",
      location: "42 Maple Lane",
      dateLabel: "September 2025",
      image: null,
      motif: "home",
      letter:
        "Two boxes of dishes, one wobbly shelf, and a couch we both insisted was 'fine.'\n\nThe first night in, we slept on the floor surrounded by cardboard and called it a start. It was the most expensive and the cheapest night of my life.\n\nWorth every single inch.",
    },
  ],

  voiceNotes: [],

  adminPin: "1234",

  // Set automatically by "Create our shared endpoint" in Admin → Sync & data.
  remoteEndpoint: null,

  updatedAt: "2023-03-04T00:00:00.000Z",
};
