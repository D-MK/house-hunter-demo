/**
 * Deterministic, seeded house illustration.
 *
 * Every listing needs a picture and this demo has no photographs by design — a
 * public portfolio piece has no business hosting scraped property images, and
 * stock photos of houses would imply the listings are real. So each card draws
 * its own inline SVG instead, seeded from the listing id: the same listing gets
 * the same house on every render and every visit, and nothing is fetched.
 *
 * The drawing reads a few real fields (property type, outbuilding, pod space)
 * so the art agrees with the data rather than being random decoration.
 */

import { useId } from "react";

/** FNV-1a — small, fast, and stable across runs (unlike hashing by iteration). */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — 32-bit PRNG, seeded once per listing. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = [
  ["#dff1f7", "#f7f0e2"],
  ["#e6eef8", "#fbf3e6"],
  ["#dceef0", "#fdf6ec"],
  ["#e9e6f6", "#fdefe4"],
] as const;

const WALLS = [
  "#f4ede1",
  "#e8ded0",
  "#dfe6e0",
  "#e6ecf2",
  "#f0e3d8",
  "#e3ddd2",
] as const;

const ROOFS = ["#3f4d57", "#4a4a52", "#6b4a3e", "#2f3d46", "#5a5148"] as const;
const DOORS = ["#2f5d62", "#7a3b2e", "#3a4a7a", "#4a5d3a", "#7a5a2a"] as const;
const GLASS = "#b9d6e2";
const LIT = "#fbc94a";

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

export interface HouseArtProps {
  seed: string;
  propertyType: string;
  outbuilding: boolean;
  podSpace: boolean;
  className?: string;
}

export function HouseArt({
  seed,
  propertyType,
  outbuilding,
  podSpace,
  className,
}: HouseArtProps) {
  const uid = useId();
  const skyId = `sky-${uid}`;
  const random = rng(hash(seed));

  const [skyTop, skyBottom] = pick(SKIES, random);
  const wall = pick(WALLS, random);
  const roof = pick(ROOFS, random);
  const door = pick(DOORS, random);
  const grass = pick(["#cfdcc2", "#c9d8bd", "#d5ddc4"] as const, random);
  const hill = pick(["#b9cdbb", "#aec5bb", "#c2cfb6"] as const, random);
  const groundY = 132;

  return (
    <svg
      viewBox="0 0 320 170"
      className={className}
      role="img"
      aria-label={`Illustration of a ${propertyType.toLowerCase()} property`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBottom} />
        </linearGradient>
      </defs>

      <rect width="320" height="170" fill={`url(#${skyId})`} />

      {/* Sun and a couple of clouds, positioned by the seed. The sun is kept to
          one side or the other so the roof doesn't eclipse it. */}
      <circle
        cx={random() > 0.5 ? 34 + random() * 40 : 246 + random() * 40}
        cy={26 + random() * 14}
        r={12 + random() * 6}
        fill="#fbe6b0"
        opacity="0.9"
      />
      {[0, 1].map((i) => {
        const cx = 30 + random() * 260;
        const cy = 24 + random() * 30;
        const s = 0.7 + random() * 0.6;
        return (
          <g key={`cloud-${i}`} opacity="0.75" fill="#ffffff">
            <ellipse cx={cx} cy={cy} rx={22 * s} ry={8 * s} />
            <ellipse cx={cx - 12 * s} cy={cy + 2 * s} rx={13 * s} ry={6 * s} />
            <ellipse cx={cx + 13 * s} cy={cy + 2 * s} rx={11 * s} ry={5 * s} />
          </g>
        );
      })}

      {/* Rolling ground. */}
      <path
        d={`M0 ${groundY - 18} Q 80 ${groundY - 34} 160 ${groundY - 20} T 320 ${groundY - 26} V170 H0 Z`}
        fill={hill}
        opacity="0.75"
      />
      <path
        d={`M0 ${groundY} Q 90 ${groundY - 10} 180 ${groundY + 2} T 320 ${groundY - 2} V170 H0 Z`}
        fill={grass}
      />

      <Building
        propertyType={propertyType}
        groundY={groundY}
        wall={wall}
        roof={roof}
        door={door}
        random={random}
      />

      {outbuilding ? (
        <g>
          <rect
            x="18"
            y={groundY - 26}
            width="42"
            height="26"
            rx="2"
            fill={wall}
            stroke="#00000018"
          />
          <path
            d={`M14 ${groundY - 26} H64 L58 ${groundY - 38} H20 Z`}
            fill={roof}
          />
          <rect
            x="32"
            y={groundY - 18}
            width="14"
            height="18"
            fill={door}
            opacity="0.85"
          />
        </g>
      ) : null}

      {podSpace ? (
        <g>
          <rect
            x="262"
            y={groundY - 20}
            width="42"
            height="20"
            rx="3"
            fill="#6f6153"
          />
          <rect
            x="266"
            y={groundY - 16}
            width="20"
            height="12"
            rx="1.5"
            fill={GLASS}
          />
          <rect
            x="258"
            y={groundY - 23}
            width="50"
            height="4"
            rx="2"
            fill={roof}
          />
        </g>
      ) : null}

      {/* Planting, always drawn last so it overlaps the buildings' footings. */}
      {[0, 1, 2].map((i) => {
        const x = 12 + random() * 296;
        const s = 0.6 + random() * 0.7;
        return (
          <g key={`tree-${i}`}>
            <rect
              x={x - 1.6 * s}
              y={groundY - 14 * s}
              width={3.2 * s}
              height={16 * s}
              fill="#7a6350"
            />
            <circle cx={x} cy={groundY - 18 * s} r={9 * s} fill="#8fae7d" />
            <circle
              cx={x - 5 * s}
              cy={groundY - 13 * s}
              r={6.5 * s}
              fill="#9fbb8b"
            />
            <circle
              cx={x + 5 * s}
              cy={groundY - 14 * s}
              r={6 * s}
              fill="#7fa273"
            />
          </g>
        );
      })}
    </svg>
  );
}

interface BuildingProps {
  propertyType: string;
  groundY: number;
  wall: string;
  roof: string;
  door: string;
  random: () => number;
}

function Building({
  propertyType,
  groundY,
  wall,
  roof,
  door,
  random,
}: BuildingProps) {
  const type = propertyType.toLowerCase();
  const stroke = "#00000018";

  if (type.startsWith("apartment")) {
    const floors = 3 + Math.floor(random() * 2);
    const height = floors * 26;
    const top = groundY - height;
    return (
      <g>
        <rect
          x="108"
          y={top}
          width="104"
          height={height}
          fill={wall}
          stroke={stroke}
        />
        <rect x="104" y={top - 6} width="112" height="7" rx="1.5" fill={roof} />
        {Array.from({ length: floors }).map((_, row) =>
          Array.from({ length: 3 }).map((__, col) => (
            <rect
              key={`w-${row}-${col}`}
              x={118 + col * 30}
              y={top + 10 + row * 26}
              width="20"
              height="14"
              rx="1"
              fill={random() > 0.72 ? LIT : GLASS}
              stroke={stroke}
            />
          )),
        )}
        <rect
          x={150}
          y={groundY - 20}
          width="20"
          height="20"
          rx="1"
          fill={door}
        />
      </g>
    );
  }

  if (type.startsWith("terrace")) {
    const top = groundY - 62;
    return (
      <g>
        {[0, 1, 2].map((i) => {
          const x = 84 + i * 52;
          return (
            <g key={`unit-${i}`}>
              <rect
                x={x}
                y={top}
                width="52"
                height="62"
                fill={wall}
                stroke={stroke}
              />
              <rect
                x={x + 8}
                y={top + 10}
                width="16"
                height="14"
                rx="1"
                fill={random() > 0.65 ? LIT : GLASS}
                stroke={stroke}
              />
              <rect
                x={x + 30}
                y={top + 10}
                width="14"
                height="14"
                rx="1"
                fill={GLASS}
                stroke={stroke}
              />
              <rect
                x={x + 18}
                y={groundY - 24}
                width="16"
                height="24"
                rx="1"
                fill={door}
              />
              <rect x={x + 22} y={top - 16} width="7" height="16" fill={roof} />
            </g>
          );
        })}
        <path d={`M78 ${top} H246 L232 ${top - 16} H92 Z`} fill={roof} />
      </g>
    );
  }

  if (type.startsWith("bungalow")) {
    const top = groundY - 44;
    return (
      <g>
        <rect
          x="76"
          y={top}
          width="168"
          height="44"
          fill={wall}
          stroke={stroke}
        />
        <path d={`M68 ${top} H252 L212 ${top - 26} H108 Z`} fill={roof} />
        <rect x="118" y={top - 20} width="8" height="20" fill="#7d7268" />
        {[0, 1, 2].map((i) => (
          <rect
            key={`bw-${i}`}
            x={90 + i * 54}
            y={top + 12}
            width="26"
            height="18"
            rx="1"
            fill={random() > 0.7 ? LIT : GLASS}
            stroke={stroke}
          />
        ))}
        <rect
          x={196}
          y={groundY - 26}
          width="20"
          height="26"
          rx="1"
          fill={door}
        />
      </g>
    );
  }

  if (type.startsWith("cottage")) {
    const top = groundY - 40;
    return (
      <g>
        <rect
          x="106"
          y={top}
          width="108"
          height="40"
          fill={wall}
          stroke={stroke}
        />
        <path d={`M98 ${top} H222 L160 ${top - 34} Z`} fill={roof} />
        <rect x="188" y={top - 26} width="9" height="20" fill="#7d7268" />
        <rect
          x="120"
          y={top + 10}
          width="20"
          height="16"
          rx="1"
          fill={random() > 0.6 ? LIT : GLASS}
          stroke={stroke}
        />
        <rect
          x="180"
          y={top + 10}
          width="20"
          height="16"
          rx="1"
          fill={GLASS}
          stroke={stroke}
        />
        <rect
          x={152}
          y={groundY - 24}
          width="18"
          height="24"
          rx="1"
          fill={door}
        />
      </g>
    );
  }

  if (type.startsWith("semi")) {
    const top = groundY - 58;
    return (
      <g>
        <rect
          x="86"
          y={top}
          width="148"
          height="58"
          fill={wall}
          stroke={stroke}
        />
        <path d={`M78 ${top} H242 L204 ${top - 28} H116 Z`} fill={roof} />
        <line
          x1="160"
          y1={top - 28}
          x2="160"
          y2={groundY}
          stroke="#00000022"
          strokeWidth="1.5"
        />
        <rect x="140" y={top - 22} width="8" height="22" fill="#7d7268" />
        {[0, 1].map((side) => {
          const base = side === 0 ? 96 : 172;
          return (
            <g key={`half-${side}`}>
              <rect
                x={base}
                y={top + 12}
                width="22"
                height="16"
                rx="1"
                fill={random() > 0.68 ? LIT : GLASS}
                stroke={stroke}
              />
              <rect
                x={base + 30}
                y={top + 12}
                width="22"
                height="16"
                rx="1"
                fill={GLASS}
                stroke={stroke}
              />
              <rect
                x={base + 14}
                y={groundY - 26}
                width="18"
                height="26"
                rx="1"
                fill={door}
              />
            </g>
          );
        })}
      </g>
    );
  }

  // Detached (and anything unrecognised).
  const top = groundY - 62;
  return (
    <g>
      <rect
        x="104"
        y={top}
        width="118"
        height="62"
        fill={wall}
        stroke={stroke}
      />
      <path d={`M94 ${top} H232 L196 ${top - 30} H130 Z`} fill={roof} />
      <rect x="148" y={top - 26} width="9" height="26" fill="#7d7268" />
      {[0, 1].map((i) => (
        <rect
          key={`dw-${i}`}
          x={118 + i * 62}
          y={top + 12}
          width="26"
          height="18"
          rx="1"
          fill={random() > 0.66 ? LIT : GLASS}
          stroke={stroke}
        />
      ))}
      <rect
        x="118"
        y={top + 38}
        width="26"
        height="18"
        rx="1"
        fill={GLASS}
        stroke={stroke}
      />
      <rect
        x={180}
        y={groundY - 28}
        width="22"
        height="28"
        rx="1"
        fill={door}
      />
    </g>
  );
}
