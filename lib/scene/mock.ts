import type { SceneJSON } from "./schema";

export const mockScene: SceneJSON = {
  steps: [
    {
      title: "Lay out parts",
      caption: "Identify legs, shelf boards, and hardware from the carton.",
      parts: [
        { id: "leg-a", label: "Leg A", x: 120, y: 420, rotationDeg: 0 },
        { id: "leg-b", label: "Leg B", x: 520, y: 420, rotationDeg: 0 },
        { id: "shelf-1", label: "Shelf", x: 320, y: 260, rotationDeg: 0 },
      ],
    },
    {
      title: "Attach legs to shelf",
      caption: "Fasten each leg to the shelf corners using the provided bolts.",
      parts: [
        { id: "leg-a", label: "Leg A", x: 200, y: 380, rotationDeg: -12 },
        { id: "leg-b", label: "Leg B", x: 440, y: 380, rotationDeg: 12 },
        { id: "shelf-1", label: "Shelf", x: 320, y: 280, rotationDeg: 0 },
      ],
    },
    {
      title: "Install back panel",
      caption: "Slide the back panel into the grooves and secure with screws.",
      parts: [
        { id: "back", label: "Back panel", x: 320, y: 200, rotationDeg: 0 },
        { id: "shelf-1", label: "Shelf", x: 320, y: 320, rotationDeg: 0 },
      ],
    },
  ],
};
