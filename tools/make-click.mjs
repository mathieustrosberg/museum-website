// Génère un court son de clic (WAV 16 bits mono, 44.1 kHz), synthèse originale.
// Usage : node tools/make-click.mjs
import { mkdir, writeFile } from "node:fs/promises";

const OUT = new URL("../public/audio/", import.meta.url).pathname;
const RATE = 44100;
const LENGTH = Math.floor(RATE * 0.05); // 50 ms

const samples = new Int16Array(LENGTH);
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};

for (let i = 0; i < LENGTH; i++) {
  const t = i / RATE;
  const env = Math.exp(-t * 180); // décroissance rapide
  const tick =
    Math.sin(2 * Math.PI * 2400 * t) * 0.5 + // tonalité brève
    rand() * 0.35; // souffle
  samples[i] = Math.max(-1, Math.min(1, tick * env)) * 32767;
}

const data = Buffer.from(samples.buffer);
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}click.wav`, Buffer.concat([header, data]));
console.log("click.wav", header.length + data.length, "bytes");
