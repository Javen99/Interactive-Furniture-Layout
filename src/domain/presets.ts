import { defaultWeights } from "./scoring";
import type { LayoutScene } from "./types";

export const galleyKitchen: LayoutScene = {
  id: "galley-worktop",
  name: "Galley Worktop",
  description: "A small L-shaped kitchen with sink and hob cutouts.",
  metadata: {
    difficulty: "intro",
    baselineName: "Crowded prep run",
    evaluationSeeds: ["alpha", "bravo", "charlie"]
  },
  room: {
    width: 900,
    height: 560,
    walls: [
      { id: "wall-top", label: "Top wall", x: 60, y: 42, width: 780, height: 10 },
      { id: "wall-left", label: "Left wall", x: 50, y: 42, width: 10, height: 420 },
      { id: "wall-right", label: "Right wall", x: 840, y: 42, width: 10, height: 420 }
    ],
    surfaces: [
      { id: "back-run", label: "Back worktop", kind: "worktop", wallEdge: "top", x: 90, y: 70, width: 720, height: 150 },
      { id: "left-run", label: "Left return", kind: "worktop", wallEdge: "left", x: 90, y: 220, width: 150, height: 240 }
    ],
    fixtures: [
      { id: "sink", label: "Sink", kind: "sink", surfaceId: "back-run", x: 238, y: 102, width: 116, height: 74, clearance: 28 },
      { id: "hob", label: "Hob", kind: "hob", surfaceId: "back-run", x: 572, y: 100, width: 124, height: 80, clearance: 32 },
      { id: "window", label: "Window", kind: "window", x: 392, y: 42, width: 136, height: 10, clearance: 0 },
      { id: "door", label: "Door", kind: "door", x: 400, y: 500, width: 110, height: 18, clearance: 0 }
    ],
    viewPoint: { x: 450, y: 522 },
    focalPoint: { x: 450, y: 120 }
  },
  weights: defaultWeights,
  props: [
    {
      id: "soap",
      label: "Soap",
      tags: ["soap", "washing"],
      width: 34,
      height: 30,
      pose: { x: 380, y: 156, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run", "left-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#2f9e8f",
      preference: "backEdge"
    },
    {
      id: "pan",
      label: "Pan",
      tags: ["pan", "cooking", "aligned"],
      width: 82,
      height: 48,
      pose: { x: 498, y: 150, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#546a7b",
      preference: "frontEdge"
    },
    {
      id: "spices",
      label: "Spices",
      tags: ["spice", "cooking", "aligned"],
      width: 70,
      height: 32,
      pose: { x: 710, y: 185, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#d18f35",
      preference: "backEdge"
    },
    {
      id: "board",
      label: "Board",
      tags: ["prep", "aligned"],
      width: 92,
      height: 60,
      pose: { x: 420, y: 160, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run", "left-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#b7794c",
      preference: "center"
    },
    {
      id: "kettle",
      label: "Kettle",
      tags: ["appliance", "utility"],
      width: 58,
      height: 58,
      pose: { x: 175, y: 315, rotation: 0, surfaceId: "left-run" },
      allowedSurfaceIds: ["left-run", "back-run"],
      orientationOptions: [0],
      pinned: true,
      color: "#c8553d",
      preference: "backEdge"
    },
    {
      id: "plant",
      label: "Plant",
      tags: ["display"],
      width: 48,
      height: 48,
      pose: { x: 468, y: 130, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run", "left-run"],
      orientationOptions: [0],
      pinned: false,
      color: "#5c946e",
      preference: "display"
    }
  ]
};

export const islandPrep: LayoutScene = {
  id: "island-prep",
  name: "Island Prep",
  description: "A back counter and island with a clearer display axis.",
  metadata: {
    difficulty: "moderate",
    baselineName: "Split prep and display",
    evaluationSeeds: ["delta", "echo", "foxtrot"]
  },
  room: {
    width: 900,
    height: 620,
    walls: [{ id: "wall-top", label: "Top wall", x: 70, y: 48, width: 760, height: 10 }],
    surfaces: [
      { id: "back-counter", label: "Back counter", kind: "worktop", wallEdge: "top", x: 100, y: 82, width: 700, height: 145 },
      { id: "island", label: "Island", kind: "worktop", wallEdge: "none", x: 248, y: 350, width: 420, height: 150 }
    ],
    fixtures: [
      { id: "sink", label: "Sink", kind: "sink", surfaceId: "island", x: 398, y: 383, width: 112, height: 70, clearance: 26 },
      { id: "hob", label: "Hob", kind: "hob", surfaceId: "back-counter", x: 548, y: 114, width: 124, height: 78, clearance: 32 },
      { id: "window", label: "Window", kind: "window", x: 312, y: 48, width: 180, height: 10, clearance: 0 },
      { id: "door", label: "Door", kind: "door", x: 72, y: 502, width: 18, height: 100, clearance: 0 }
    ],
    viewPoint: { x: 450, y: 594 },
    focalPoint: { x: 450, y: 170 }
  },
  weights: defaultWeights,
  props: [
    {
      id: "soap",
      label: "Soap",
      tags: ["soap", "washing"],
      width: 34,
      height: 30,
      pose: { x: 308, y: 406, rotation: 0, surfaceId: "island" },
      allowedSurfaceIds: ["island"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#2f9e8f",
      preference: "sideEdge"
    },
    {
      id: "pot",
      label: "Pot",
      tags: ["pot", "cooking"],
      width: 64,
      height: 58,
      pose: { x: 488, y: 154, rotation: 0, surfaceId: "back-counter" },
      allowedSurfaceIds: ["back-counter"],
      orientationOptions: [0],
      pinned: false,
      color: "#59656f",
      preference: "frontEdge"
    },
    {
      id: "spices",
      label: "Spices",
      tags: ["spice", "cooking", "aligned"],
      width: 76,
      height: 32,
      pose: { x: 712, y: 182, rotation: 0, surfaceId: "back-counter" },
      allowedSurfaceIds: ["back-counter"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#d18f35",
      preference: "backEdge"
    },
    {
      id: "board",
      label: "Board",
      tags: ["prep", "aligned"],
      width: 96,
      height: 62,
      pose: { x: 535, y: 424, rotation: 0, surfaceId: "island" },
      allowedSurfaceIds: ["island"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#b7794c",
      preference: "center"
    },
    {
      id: "bowl",
      label: "Bowl",
      tags: ["display"],
      width: 56,
      height: 56,
      pose: { x: 326, y: 134, rotation: 0, surfaceId: "back-counter" },
      allowedSurfaceIds: ["back-counter", "island"],
      orientationOptions: [0],
      pinned: false,
      color: "#6a8caf",
      preference: "display"
    },
    {
      id: "coffee",
      label: "Coffee",
      tags: ["appliance", "utility", "aligned"],
      width: 76,
      height: 58,
      pose: { x: 158, y: 154, rotation: 0, surfaceId: "back-counter" },
      allowedSurfaceIds: ["back-counter"],
      orientationOptions: [0],
      pinned: true,
      color: "#7a5c58",
      preference: "backEdge"
    }
  ]
};

export const compactCorner: LayoutScene = {
  id: "compact-corner",
  name: "Compact Corner",
  description: "A tight corner kitchen with limited landing zones around sink and hob.",
  metadata: {
    difficulty: "stress",
    baselineName: "Blocked landing zones",
    evaluationSeeds: ["golf", "hotel", "india"]
  },
  room: {
    width: 820,
    height: 560,
    walls: [
      { id: "wall-top", label: "Top wall", x: 72, y: 42, width: 612, height: 10 },
      { id: "wall-right", label: "Right wall", x: 684, y: 42, width: 10, height: 404 }
    ],
    surfaces: [
      { id: "back-run", label: "Back worktop", kind: "worktop", wallEdge: "top", x: 96, y: 72, width: 560, height: 140 },
      { id: "right-run", label: "Right return", kind: "worktop", wallEdge: "right", x: 516, y: 212, width: 140, height: 230 }
    ],
    fixtures: [
      { id: "sink", label: "Sink", kind: "sink", surfaceId: "back-run", x: 186, y: 102, width: 104, height: 70, clearance: 28 },
      { id: "hob", label: "Hob", kind: "hob", surfaceId: "right-run", x: 548, y: 274, width: 76, height: 108, clearance: 30 },
      { id: "window", label: "Window", kind: "window", x: 318, y: 42, width: 142, height: 10, clearance: 0 },
      { id: "door", label: "Door", kind: "door", x: 88, y: 500, width: 112, height: 18, clearance: 0 }
    ],
    viewPoint: { x: 410, y: 520 },
    focalPoint: { x: 492, y: 150 }
  },
  weights: defaultWeights,
  props: [
    {
      id: "soap",
      label: "Soap",
      tags: ["soap", "washing"],
      width: 34,
      height: 30,
      pose: { x: 320, y: 172, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#2f9e8f",
      preference: "backEdge"
    },
    {
      id: "pan",
      label: "Pan",
      tags: ["pan", "cooking", "aligned"],
      width: 78,
      height: 46,
      pose: { x: 586, y: 238, rotation: 90, surfaceId: "right-run" },
      allowedSurfaceIds: ["right-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#546a7b",
      preference: "frontEdge"
    },
    {
      id: "oil",
      label: "Oil",
      tags: ["cooking", "spice"],
      width: 38,
      height: 38,
      pose: { x: 560, y: 390, rotation: 0, surfaceId: "right-run" },
      allowedSurfaceIds: ["right-run", "back-run"],
      orientationOptions: [0],
      pinned: false,
      color: "#c88b35",
      preference: "backEdge"
    },
    {
      id: "board",
      label: "Board",
      tags: ["prep", "aligned"],
      width: 90,
      height: 58,
      pose: { x: 402, y: 144, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run", "right-run"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#b7794c",
      preference: "center"
    },
    {
      id: "mixer",
      label: "Mixer",
      tags: ["appliance", "utility", "aligned"],
      width: 74,
      height: 64,
      pose: { x: 605, y: 150, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run"],
      orientationOptions: [0],
      pinned: true,
      color: "#7a5c58",
      preference: "backEdge"
    },
    {
      id: "herbs",
      label: "Herbs",
      tags: ["display"],
      width: 46,
      height: 46,
      pose: { x: 502, y: 152, rotation: 0, surfaceId: "back-run" },
      allowedSurfaceIds: ["back-run", "right-run"],
      orientationOptions: [0],
      pinned: false,
      color: "#5c946e",
      preference: "display"
    }
  ]
};

export const servingRun: LayoutScene = {
  id: "serving-run",
  name: "Serving Run",
  description: "A long serving counter where display quality and balance matter more than clearance.",
  metadata: {
    difficulty: "moderate",
    baselineName: "Unbalanced display",
    evaluationSeeds: ["juliet", "kilo", "lima"]
  },
  room: {
    width: 940,
    height: 520,
    walls: [{ id: "wall-top", label: "Top wall", x: 70, y: 44, width: 800, height: 10 }],
    surfaces: [{ id: "serving-counter", label: "Serving counter", kind: "worktop", wallEdge: "top", x: 95, y: 78, width: 760, height: 150 }],
    fixtures: [
      { id: "sink", label: "Sink", kind: "sink", surfaceId: "serving-counter", x: 164, y: 108, width: 100, height: 70, clearance: 24 },
      { id: "hob", label: "Hob", kind: "hob", surfaceId: "serving-counter", x: 658, y: 108, width: 116, height: 74, clearance: 28 },
      { id: "window", label: "Window", kind: "window", x: 366, y: 44, width: 196, height: 10, clearance: 0 }
    ],
    viewPoint: { x: 470, y: 480 },
    focalPoint: { x: 470, y: 130 }
  },
  weights: defaultWeights,
  props: [
    {
      id: "soap",
      label: "Soap",
      tags: ["soap", "washing"],
      width: 34,
      height: 30,
      pose: { x: 306, y: 178, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#2f9e8f",
      preference: "backEdge"
    },
    {
      id: "tray",
      label: "Tray",
      tags: ["display", "aligned"],
      width: 112,
      height: 62,
      pose: { x: 390, y: 150, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#6a8caf",
      preference: "display"
    },
    {
      id: "spices",
      label: "Spices",
      tags: ["spice", "cooking", "aligned"],
      width: 82,
      height: 32,
      pose: { x: 790, y: 182, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#d18f35",
      preference: "backEdge"
    },
    {
      id: "bowl",
      label: "Bowl",
      tags: ["display"],
      width: 56,
      height: 56,
      pose: { x: 472, y: 156, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0],
      pinned: false,
      color: "#8f6aae",
      preference: "display"
    },
    {
      id: "coffee",
      label: "Coffee",
      tags: ["appliance", "utility", "aligned"],
      width: 78,
      height: 58,
      pose: { x: 580, y: 154, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0],
      pinned: true,
      color: "#7a5c58",
      preference: "backEdge"
    },
    {
      id: "pan",
      label: "Pan",
      tags: ["pan", "cooking"],
      width: 76,
      height: 48,
      pose: { x: 612, y: 178, rotation: 0, surfaceId: "serving-counter" },
      allowedSurfaceIds: ["serving-counter"],
      orientationOptions: [0, 90],
      pinned: false,
      color: "#546a7b",
      preference: "frontEdge"
    }
  ]
};

export const presets = [galleyKitchen, islandPrep, compactCorner, servingRun];
