import { ImageResponse } from "next/og";

/** Icône Apple (180 px) : le damier d'icon.svg, généré au build. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BLACK = new Set(["0,0", "2,0", "1,1", "3,1", "0,2", "2,2", "1,3", "3,3"]);
const CELLS = Array.from(
  { length: 16 },
  (_, i) => `${i % 4},${Math.floor(i / 4)}`,
);

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexWrap: "wrap",
        background: "#fff",
      }}
    >
      {CELLS.map((cell) => (
        <div
          key={cell}
          style={{
            width: 45,
            height: 45,
            background: BLACK.has(cell) ? "#000" : "#fff",
          }}
        />
      ))}
    </div>,
    size,
  );
}
