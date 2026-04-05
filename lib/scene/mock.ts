import type { SceneJSON } from "./schema";

/**
 * MALM Bed Frame Assembly — black-brown (AA-740446-8)
 *
 * 8 steps covering the key assembly moments from the IKEA manual.
 * Canvas: 1000×500. Isometric: depth extends upper-right.
 *
 * Key hardware:
 *   101359 — Small wooden dowels (×12) — align headboard to rails
 *   101367 — Large wooden support posts (×5) — hold slatted base
 *   110789 — Small Phillips screws (×20) — slat bracket screws
 *   114334 — Cam bolt shaft (×4) — footboard cam connector
 *   114670 — Cam lock disc (×8) — click-lock mechanism
 *   122628 — Plastic nail clips (×6) — centre support slat holder
 *   123491 — Cam bolt assembly, long (×8) — primary rail connector
 *
 * Step layout:
 *   1 — Identify all parts (overview)
 *   2 — Nail clips into footboard inner edge (Step 1 in manual)
 *   3 — Insert cam bolt assemblies into side rails (Step 2)
 *   4 — Press wooden dowels into headboard sides (Step 3)
 *   5 — Fit cam locks to side rails, tighten with allen key (Step 4)
 *   6 — Slide rails onto headboard — U-frame takes shape (Step 7)
 *   7 — Lower footboard onto rail ends — closed rectangle (Step 6)
 *   8 — Insert 5 centre support posts + final assembled view (Steps 5 + 13)
 */
export const mockScene: SceneJSON = {
  steps: [
    // ── Step 1: Identify all parts ──────────────────────────────────────────
    {
      title: "Identify all parts",
      caption:
        "Unpack all components and lay them out. Check you have: headboard, footboard, two side rails, and the hardware bag.",
      parts: [
        // Headboard — tall panel, left zone
        {
          id: "headboard",
          label: "Headboard",
          x: 170,
          y: 200,
          rotationDeg: 0,
          shape: "panel",
          w: 260,
          h: 140,
          d: 14,
          material: "wood",
        },
        // Side rails stacked, right zone
        {
          id: "rail-l",
          label: "Side rail (×2)",
          x: 630,
          y: 155,
          rotationDeg: 0,
          shape: "panel",
          w: 460,
          h: 38,
          d: 22,
          material: "wood",
        },
        {
          id: "rail-r",
          label: "",
          x: 630,
          y: 220,
          rotationDeg: 0,
          shape: "panel",
          w: 460,
          h: 38,
          d: 22,
          material: "wood",
        },
        // Footboard — shorter panel, lower-left
        {
          id: "footboard",
          label: "Footboard",
          x: 170,
          y: 390,
          rotationDeg: 0,
          shape: "panel",
          w: 260,
          h: 52,
          d: 14,
          material: "wood",
        },
        // Hardware bag representation
        {
          id: "hardware",
          label: "Hardware bag",
          x: 500,
          y: 420,
          rotationDeg: 0,
          shape: "screw",
          material: "metal",
        },
      ],
      confidence: 0.95,
      tools: [],
      warnings: [],
    },

    // ── Step 2: Nail clips into footboard inner edge (Manual Step 1) ────────
    // Footboard lies flat on a carpet. 6 plastic clips (122628) hammer
    // into holes along the inner top edge to hold the centre support slat.
    {
      title: "Clip the footboard edge",
      caption:
        "Lay the footboard flat on a soft surface. Hammer 6 plastic nail clips (122628) into the pre-drilled holes along the inner top edge.",
      parts: [
        {
          id: "footboard",
          label: "Footboard",
          x: 490,
          y: 320,
          rotationDeg: 0,
          shape: "panel",
          w: 320,
          h: 14,
          d: 80,
          material: "wood",
          holes: [
            { hx: -130, hy: 4 },
            { hx: -78, hy: 4 },
            { hx: -26, hy: 4 },
            { hx: 26, hy: 4 },
            { hx: 78, hy: 4 },
            { hx: 130, hy: 4 },
          ],
        },
        // 6 clips start well above (angle 0 = down), spread across the edge
        {
          id: "clip-1",
          label: "Clip",
          x: 360,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 0 },
        },
        {
          id: "clip-2",
          label: "Clip",
          x: 412,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 1 },
        },
        {
          id: "clip-3",
          label: "Clip",
          x: 464,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 2 },
        },
        {
          id: "clip-4",
          label: "Clip",
          x: 516,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 3 },
        },
        {
          id: "clip-5",
          label: "Clip",
          x: 568,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 4 },
        },
        {
          id: "clip-6",
          label: "Clip",
          x: 620,
          y: 180,
          rotationDeg: 0,
          shape: "bracket",
          material: "plastic",
          insertionTarget: { targetPartId: "footboard", angle: 0, holeIndex: 5 },
        },
      ],
      confidence: 0.9,
      tools: ["Hammer"],
      warnings: ["Lay a blanket or cardboard on the floor first to protect the finish."],
      toolIcons: [{ tool: "hammer", x: 860, y: 200, rotationDeg: -30 }],
    },

    // ── Step 3: Insert cam bolt assemblies into side rails (Manual Step 2) ──
    // Both rails lie flat. 4 cam bolt assemblies (123491) go into each rail
    // — 2 at the headboard end, 2 at the footboard end. 8 total.
    {
      title: "Fit cam bolts in rails",
      caption:
        "Lay both side rails flat. Thread 4 cam bolt assemblies (123491) into the pre-drilled holes at each end of each rail — 8 total.",
      parts: [
        {
          id: "rail-l",
          label: "Left side rail",
          x: 430,
          y: 190,
          rotationDeg: 0,
          shape: "panel",
          w: 480,
          h: 38,
          d: 22,
          material: "wood",
          holes: [
            { hx: -200, hy: 0 },
            { hx: -168, hy: 0 },
            { hx: 168, hy: 0 },
            { hx: 200, hy: 0 },
          ],
        },
        {
          id: "rail-r",
          label: "Right side rail",
          x: 430,
          y: 330,
          rotationDeg: 0,
          shape: "panel",
          w: 480,
          h: 38,
          d: 22,
          material: "wood",
          holes: [
            { hx: -200, hy: 0 },
            { hx: -168, hy: 0 },
            { hx: 168, hy: 0 },
            { hx: 200, hy: 0 },
          ],
        },
        // Left rail — left end cam bolts (start 100 units above rail)
        {
          id: "cb-ll1",
          label: "Cam bolt",
          x: 230,
          y: 90,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 0 },
        },
        {
          id: "cb-ll2",
          label: "Cam bolt",
          x: 262,
          y: 90,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 1 },
        },
        // Left rail — right end cam bolts
        {
          id: "cb-lr1",
          label: "Cam bolt",
          x: 598,
          y: 90,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 2 },
        },
        {
          id: "cb-lr2",
          label: "Cam bolt",
          x: 630,
          y: 90,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 3 },
        },
        // Right rail — left end cam bolts
        {
          id: "cb-rl1",
          label: "Cam bolt",
          x: 230,
          y: 230,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-r", angle: 0, holeIndex: 0 },
        },
        {
          id: "cb-rl2",
          label: "Cam bolt",
          x: 262,
          y: 230,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-r", angle: 0, holeIndex: 1 },
        },
        // Right rail — right end cam bolts
        {
          id: "cb-rr1",
          label: "Cam bolt",
          x: 598,
          y: 230,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-r", angle: 0, holeIndex: 2 },
        },
        {
          id: "cb-rr2",
          label: "Cam bolt",
          x: 630,
          y: 230,
          rotationDeg: 0,
          shape: "dowel",
          w: 10,
          h: 44,
          d: 10,
          material: "metal",
          insertionTarget: { targetPartId: "rail-r", angle: 0, holeIndex: 3 },
        },
      ],
      confidence: 0.9,
      tools: [],
      warnings: ["Do not force — cam bolts should slide in smoothly by hand."],
    },

    // ── Step 4: Insert wooden dowels into headboard sides (Manual Step 3) ───
    // Headboard stands upright. 4 wooden dowels (101359) press into holes
    // on both side edges — 2 per side. They align the rails during assembly.
    {
      title: "Press dowels into headboard",
      caption:
        "Stand the headboard upright. Press 4 wooden dowels (101359) firmly by hand into the holes on both side edges — 2 holes per side.",
      parts: [
        {
          id: "headboard",
          label: "Headboard",
          x: 500,
          y: 255,
          rotationDeg: 0,
          shape: "panel",
          w: 280,
          h: 160,
          d: 14,
          material: "wood",
          holes: [
            // Left edge holes (hx negative = left)
            { hx: -128, hy: -42 },
            { hx: -128, hy: 14 },
            // Right edge holes (hx positive = right)
            { hx: 128, hy: -42 },
            { hx: 128, hy: 14 },
          ],
        },
        // Left-side dowels arrive from the left (angle 270 = insert rightward)
        {
          id: "dowel-l1",
          label: "Dowel",
          x: 280,
          y: 193,
          rotationDeg: 90,
          shape: "dowel",
          w: 10,
          h: 40,
          d: 10,
          material: "wood",
          insertionTarget: { targetPartId: "headboard", angle: 270, holeIndex: 0 },
        },
        {
          id: "dowel-l2",
          label: "Dowel",
          x: 280,
          y: 249,
          rotationDeg: 90,
          shape: "dowel",
          w: 10,
          h: 40,
          d: 10,
          material: "wood",
          insertionTarget: { targetPartId: "headboard", angle: 270, holeIndex: 1 },
        },
        // Right-side dowels arrive from the right (angle 90 = insert leftward)
        {
          id: "dowel-r1",
          label: "Dowel",
          x: 720,
          y: 193,
          rotationDeg: 90,
          shape: "dowel",
          w: 10,
          h: 40,
          d: 10,
          material: "wood",
          insertionTarget: { targetPartId: "headboard", angle: 90, holeIndex: 2 },
        },
        {
          id: "dowel-r2",
          label: "Dowel",
          x: 720,
          y: 249,
          rotationDeg: 90,
          shape: "dowel",
          w: 10,
          h: 40,
          d: 10,
          material: "wood",
          insertionTarget: { targetPartId: "headboard", angle: 90, holeIndex: 3 },
        },
      ],
      confidence: 0.92,
      tools: [],
      warnings: ["Press firmly by hand only — do not hammer the dowels in."],
      toolIcons: [{ tool: "hand", x: 860, y: 240, rotationDeg: 0 }],
    },

    // ── Step 5: Fit cam locks to side rails (Manual Step 4) ──────────────────
    // One rail shown face-on. 4 cam lock discs (114670) drop into the large
    // round holes. After inserting, rotate 90° with the allen key to lock.
    {
      title: "Install cam locks",
      caption:
        "Insert 4 cam lock discs (114670) into the large circular holes on each side rail. Then use the allen key to rotate each lock 90° clockwise until it clicks.",
      parts: [
        {
          id: "rail-l",
          label: "Side rail (inner face)",
          x: 490,
          y: 290,
          rotationDeg: 0,
          shape: "panel",
          w: 480,
          h: 38,
          d: 22,
          material: "wood",
          holes: [
            { hx: -160, hy: 0 },
            { hx: -54, hy: 0 },
            { hx: 54, hy: 0 },
            { hx: 160, hy: 0 },
          ],
        },
        // 4 cam lock discs drop in from above
        {
          id: "cam-1",
          label: "Cam lock",
          x: 330,
          y: 160,
          rotationDeg: 0,
          shape: "bracket",
          w: 26,
          h: 14,
          d: 26,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 0 },
        },
        {
          id: "cam-2",
          label: "Cam lock",
          x: 436,
          y: 160,
          rotationDeg: 0,
          shape: "bracket",
          w: 26,
          h: 14,
          d: 26,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 1 },
        },
        {
          id: "cam-3",
          label: "Cam lock",
          x: 544,
          y: 160,
          rotationDeg: 0,
          shape: "bracket",
          w: 26,
          h: 14,
          d: 26,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 2 },
        },
        {
          id: "cam-4",
          label: "Cam lock",
          x: 650,
          y: 160,
          rotationDeg: 0,
          shape: "bracket",
          w: 26,
          h: 14,
          d: 26,
          material: "metal",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 3 },
        },
      ],
      confidence: 0.9,
      tools: ["Allen key (100049)"],
      warnings: [
        "Rotate cam lock CLOCKWISE only. Stop at the click — overtightening cracks the panel.",
      ],
      toolIcons: [{ tool: "allen_key", x: 860, y: 240, rotationDeg: -25 }],
      detailInset: {
        cx: 330,
        cy: 290,
        radius: 44,
        anchorX: 150,
        anchorY: 130,
        zoom: 2.8,
      },
    },

    // ── Step 6: Slide rails onto headboard — U-frame (Manual Step 7) ────────
    // Headboard stands left. Both rails (now oriented into depth) slide onto
    // the headboard dowels. Cam bolt tips enter the cam lock openings.
    // Viewer sees the inside of the growing U-shape from slightly above.
    {
      title: "Connect rails to headboard",
      caption:
        "Stand the headboard upright. Slide both side rails onto the headboard dowels so the cam bolt tips enter the cam lock sockets. Use the plastic wrench (115887) to tighten each lock.",
      parts: [
        // Headboard standing on the left
        {
          id: "headboard",
          label: "Headboard",
          x: 190,
          y: 285,
          rotationDeg: 0,
          shape: "panel",
          w: 250,
          h: 150,
          d: 14,
          material: "wood",
        },
        // Left rail extends into depth (upper-right) from headboard
        // w=18 = narrow end face, h=45 = rail height, d=520 = rail length into depth
        {
          id: "rail-l",
          label: "Left rail",
          x: 510,
          y: 200,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 520,
          material: "wood",
          connectsTo: "headboard",
        },
        // Right rail — parallel, offset down on screen (further from viewer in iso)
        {
          id: "rail-r",
          label: "Right rail",
          x: 510,
          y: 340,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 520,
          material: "wood",
          connectsTo: "headboard",
        },
      ],
      confidence: 0.87,
      tools: ["Plastic wrench (115887)"],
      warnings: ["Have a second person steady the headboard while you tighten the cam locks."],
      toolIcons: [{ tool: "hand", x: 870, y: 270, rotationDeg: 0 }],
    },

    // ── Step 7: Lower footboard onto rail ends (Manual Step 6) ──────────────
    // U-frame is standing. Footboard lowered onto the far end of both rails.
    // Cam bolt tips enter footboard cam lock sockets; tighten to close the
    // rectangle frame. Viewer sees full bed frame rectangle from front-left.
    {
      title: "Attach the footboard",
      caption:
        "Lower the footboard onto the cam bolt ends at the far end of both rails. Press firmly until seated, then tighten the cam locks with the plastic wrench.",
      parts: [
        // Full U-frame already assembled
        {
          id: "headboard",
          label: "Headboard",
          x: 150,
          y: 295,
          rotationDeg: 0,
          shape: "panel",
          w: 250,
          h: 150,
          d: 14,
          material: "wood",
        },
        {
          id: "rail-l",
          label: "",
          x: 480,
          y: 210,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 510,
          material: "wood",
        },
        {
          id: "rail-r",
          label: "",
          x: 480,
          y: 345,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 510,
          material: "wood",
        },
        // Footboard slides in from upper-right (far end of rails)
        {
          id: "footboard",
          label: "Footboard",
          x: 790,
          y: 270,
          rotationDeg: 0,
          shape: "panel",
          w: 250,
          h: 52,
          d: 14,
          material: "wood",
          connectsTo: "rail-l",
        },
      ],
      confidence: 0.88,
      tools: ["Plastic wrench (115887)"],
      warnings: [],
      toolIcons: [{ tool: "hand", x: 870, y: 280, rotationDeg: 0 }],
    },

    // ── Step 8: Insert centre support posts — fully assembled (Manual Step 5 + 13) ──
    // Closed rectangle frame lying flat. 5 large wooden posts (101367) press
    // down into the inner holes along the top inner edge of both rails.
    // Final view shows the complete frame ready for the slatted bed base.
    {
      title: "Insert support posts",
      caption:
        "Press 5 large wooden posts (101367) into the holes along the inner top edge of both side rails. These support the slatted bed base. Your MALM bed frame is now complete.",
      parts: [
        // Full assembled frame
        {
          id: "headboard",
          label: "Headboard",
          x: 155,
          y: 295,
          rotationDeg: 0,
          shape: "panel",
          w: 250,
          h: 150,
          d: 14,
          material: "wood",
        },
        {
          id: "rail-l",
          label: "Side rail",
          x: 475,
          y: 213,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 505,
          material: "wood",
          // Holes for the 5 support posts — distributed along the rail depth
          holes: [
            { hx: 0, hy: -110 },
            { hx: 0, hy: -55 },
            { hx: 0, hy: 0 },
            { hx: 0, hy: 55 },
            { hx: 0, hy: 110 },
          ],
        },
        {
          id: "rail-r",
          label: "Side rail",
          x: 475,
          y: 348,
          rotationDeg: 0,
          shape: "panel",
          w: 18,
          h: 45,
          d: 505,
          material: "wood",
        },
        {
          id: "footboard",
          label: "Footboard",
          x: 785,
          y: 272,
          rotationDeg: 0,
          shape: "panel",
          w: 250,
          h: 52,
          d: 14,
          material: "wood",
        },
        // 5 large support posts — each starts 120 units above its hole (angle 0 = down)
        {
          id: "post-1",
          label: "Support post",
          x: 475,
          y: 93,
          rotationDeg: 0,
          shape: "leg",
          w: 20,
          h: 80,
          d: 20,
          material: "wood",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 0 },
        },
        {
          id: "post-2",
          label: "Support post",
          x: 475,
          y: 93,
          rotationDeg: 0,
          shape: "leg",
          w: 20,
          h: 80,
          d: 20,
          material: "wood",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 1 },
        },
        {
          id: "post-3",
          label: "Support post",
          x: 475,
          y: 93,
          rotationDeg: 0,
          shape: "leg",
          w: 20,
          h: 80,
          d: 20,
          material: "wood",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 2 },
        },
        {
          id: "post-4",
          label: "Support post",
          x: 475,
          y: 93,
          rotationDeg: 0,
          shape: "leg",
          w: 20,
          h: 80,
          d: 20,
          material: "wood",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 3 },
        },
        {
          id: "post-5",
          label: "Support post",
          x: 475,
          y: 93,
          rotationDeg: 0,
          shape: "leg",
          w: 20,
          h: 80,
          d: 20,
          material: "wood",
          insertionTarget: { targetPartId: "rail-l", angle: 0, holeIndex: 4 },
        },
      ],
      confidence: 0.93,
      tools: [],
      warnings: [
        "Place the slatted bed base so it rests on all 5 posts evenly before adding a mattress.",
      ],
    },
  ],
};
