/**
 * AuraSuture Pattern Engine
 * Precision industrial drafting formulas with Nakamaru curvature logic.
 */

import { AIAnalysisResult } from "../services/ai-vision";

export interface Measurements {
  neck: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder: number;
  sleeve: number;
  length: number;
  bust?: number; // Optional, specifically for female patterns
  inseam?: number; // Specifically for trousers
}

export type Gender = "male" | "female";
export type Style = "shirt" | "gown" | "senator" | "trousers";

export interface PatternPiece {
  id: string;
  name: string;
  path: string; // The "Cut" line (solid)
  seamPath: string; // The "Stitch" line (dashed)
  labels: { text: string; x: number; y: number }[];
  offset: { x: number; y: number };
  points?: { x: number; y: number; id: string }[]; // Interactive anchors
  scale?: number;
  grainLineAngle?: number; // degrees
}

/**
 * Advanced Drapery Ease Logic: 
 * Adjusts ease based on fabric behavior (drape) and garment type.
 */
function getDraftingEase(style: Style, gender: Gender): number {
  if (style === 'gown') return gender === 'female' ? 4 : 2;
  if (style === 'shirt') return 2.5;
  if (style === 'senator') return 3;
  return 1.5; // Trousers close fit
}

export function calculatePattern(
  gender: Gender,
  style: Style,
  m: Measurements,
  seamAllowance: number = 1.5,
  aiFeatures?: AIAnalysisResult
): PatternPiece[] {
  const ease = getDraftingEase(style, gender);
  
  // Extract AI suggestions
  const suggestions = aiFeatures?.geometrySuggestions || [];
  const getAdjustment = (id: string) => suggestions.find(s => s.pieceId === id)?.adjustments.toLowerCase() || "";

  if (style === 'trousers') {
    return draftTrousers(gender, m, ease, seamAllowance);
  }

  // DEFAULT/BODICE BASED STYLES (Shirt, Gown, Senator)
  return draftBodiceBased(gender, style, m, ease, seamAllowance, getAdjustment);
}

function draftTrousers(gender: Gender, m: Measurements, ease: number, allowance: number): PatternPiece[] {
  const qWaist = (m.waist / 4) + ease;
  const qHip = (m.hip / 4) + ease;
  const totalLen = m.length;
  const inseam = m.inseam || (totalLen * 0.7); // Fallback if missing
  const crotchDepth = totalLen - inseam;
  
  // Front Trousers
  const frontPoints = [
    `M 0 0`, // Waist center
    `L ${qWaist} 0`, // Waist side
    `C ${qWaist} 10 ${qHip} 20 ${qHip} ${crotchDepth}`, // Hip curve to crotch line
    `L ${qHip * 0.7} ${totalLen}`, // Down to hem side
    `L 0 ${totalLen}`, // Hem center
    `L 0 ${crotchDepth}`, // Inner leg center
    `C 0 ${crotchDepth * 0.8} ${qWaist * 0.2} 0 0 0`, // Fly curve
    `Z`
  ].join(" ");

  const frontSeamPoints = [
    `M -${allowance} -${allowance}`,
    `L ${qWaist + allowance} -${allowance}`,
    `L ${qHip + allowance} ${crotchDepth}`,
    `L ${qHip * 0.7 + allowance} ${totalLen + allowance}`,
    `L -${allowance} ${totalLen + allowance}`,
    `L -${allowance} ${crotchDepth}`,
    `Z`
  ].join(" ");

  // Back Trousers (Higher waist at back center)
  const backPoints = [
    `M 0 -5`, // Back waist center (raised)
    `L ${qWaist + 2} 0`, // Back waist side
    `C ${qWaist + 2} 10 ${qHip + 2} 20 ${qHip + 2} ${crotchDepth}`,
    `L ${(qHip + 2) * 0.8} ${totalLen}`,
    `L 0 ${totalLen}`,
    `L 0 ${crotchDepth}`,
    `C 0 ${crotchDepth * 0.7} ${qWaist * 0.3} -5 0 -5`,
    `Z`
  ].join(" ");

  const backSeamPoints = [
    `M -${allowance} -${5 + allowance}`,
    `L ${qWaist + 2 + allowance} -${allowance}`,
    `L ${qHip + 2 + allowance} ${crotchDepth}`,
    `L ${(qHip + 2) * 0.8 + allowance} ${totalLen + allowance}`,
    `L -${allowance} ${totalLen + allowance}`,
    `L -${allowance} ${crotchDepth}`,
    `Z`
  ].join(" ");

  return [
    {
      id: "front-trouser",
      name: "Front Trouser",
      path: frontPoints,
      seamPath: frontSeamPoints,
      labels: [
        { text: "Cut 2", x: qWaist/2, y: crotchDepth / 2 },
        { text: `W: ${m.waist}cm`, x: qWaist/2, y: -10 },
        { text: `L: ${totalLen}cm`, x: -15, y: totalLen / 2 }
      ],
      offset: { x: 0, y: 10 },
      points: [
        { id: 'waist-c', x: 0, y: 0 },
        { id: 'waist-s', x: qWaist, y: 0 },
        { id: 'hip-s', x: qHip, y: crotchDepth },
        { id: 'hem-s', x: qHip * 0.7, y: totalLen },
        { id: 'hem-c', x: 0, y: totalLen }
      ]
    },
    {
      id: "back-trouser",
      name: "Back Trouser",
      path: backPoints,
      seamPath: backSeamPoints,
      labels: [
        { text: "Cut 2", x: qWaist/2, y: crotchDepth /2 },
        { text: `W: ${m.waist}cm`, x: qWaist/2, y: -15 }
      ],
      offset: { x: qHip + 20, y: 15 },
      points: [
        { id: 'waist-c', x: 0, y: -5 },
        { id: 'waist-s', x: qWaist + 2, y: 0 },
        { id: 'hip-s', x: qHip + 2, y: crotchDepth },
        { id: 'hem-s', x: (qHip + 2) * 0.8, y: totalLen },
        { id: 'hem-c', x: 0, y: totalLen }
      ]
    }
  ];
}

function draftBodiceBased(
  gender: Gender, 
  style: Style, 
  m: Measurements, 
  ease: number, 
  allowance: number,
  adjustment?: (id: string) => string
): PatternPiece[] {
  // Calculations
  const baseChest = (gender === "female" && m.bust) ? m.bust : m.chest;
  
  // AI Adjustment: "increase ease" or "slim fit"
  let appliedEase = ease;
  const globalAdj = adjustment?.('global') || "";
  if (globalAdj.includes('extra volume') || globalAdj.includes('loose')) appliedEase += 2;
  if (globalAdj.includes('slim') || globalAdj.includes('tighter')) appliedEase -= 1;

  const qChest = (baseChest / 4) + appliedEase;
  const qWaist = (m.waist / 4) + appliedEase;
  const qHip = (m.hip / 4) + appliedEase;
  const halfShoulder = m.shoulder / 2;
  
  const neckWidth = (m.neck / 6) + 0.5;
  const fNeckDepth = neckWidth + (gender === "male" ? 1.5 : 1);
  const bNeckDepth = 2.5;
  
  const slope = gender === "male" ? 4.5 : 3.5;
  const ahDepth = (m.chest / 4) + 1.5;
  
  const waistY = 42; 
  const hipY = 62;

  // Enhance female curvature logic
  const waistNip = gender === 'female' ? -1.5 : 0;

  // AI Adjustment: "cropped"
  const sleeveAdj = adjustment?.('sleeve') || "";
  const bodiceAdj = adjustment?.('bodice') || "";
  const lengthScale = bodiceAdj.includes('cropped') ? 0.7 : 1;
  const targetLength = m.length * lengthScale;

  // FRONT
  const frontPath = [
    `M 0 ${fNeckDepth}`,
    `C 0 ${fNeckDepth * 0.4} ${neckWidth * 0.3} 0 ${neckWidth} 0`,
    `L ${halfShoulder} ${slope}`,
    `C ${halfShoulder} ${ahDepth * 0.5} ${halfShoulder * 0.8} ${ahDepth * 0.8} ${qChest} ${ahDepth}`,
    `L ${qWaist + waistNip} ${waistY}`,
    `C ${qWaist + waistNip} ${waistY + 10} ${qHip} ${waistY + 15} ${qHip} ${hipY}`,
    `L ${qHip} ${targetLength}`,
    `L 0 ${targetLength}`,
    `Z`
  ].join(" ");

  const frontSeamPath = [
    `M -${allowance} ${fNeckDepth - allowance}`,
    `L ${neckWidth} -${allowance}`,
    `L ${halfShoulder + allowance} ${slope - allowance}`,
    `L ${qChest + allowance} ${ahDepth + allowance}`,
    `L ${qHip + allowance} ${targetLength + allowance}`,
    `L -${allowance} ${targetLength + allowance}`,
    `Z`
  ].join(" ");

  // BACK
  const backPath = [
    `M 0 ${bNeckDepth}`,
    `C 0 ${bNeckDepth * 0.6} ${neckWidth * 0.6} 0 ${neckWidth} 0`,
    `L ${halfShoulder} ${slope}`,
    `C ${halfShoulder * 1.05} ${ahDepth * 0.4} ${halfShoulder * 1.1} ${ahDepth * 0.8} ${qChest} ${ahDepth}`,
    `L ${qWaist} ${waistY}`,
    `C ${qWaist} ${waistY + 10} ${qHip} ${waistY + 15} ${qHip} ${hipY}`,
    `L ${qHip} ${targetLength}`,
    `L 0 ${targetLength}`,
    `Z`
  ].join(" ");

  const backSeamPath = [
    `M -${allowance} ${bNeckDepth - allowance}`,
    `L ${neckWidth} -${allowance}`,
    `L ${halfShoulder + allowance} ${slope - allowance}`,
    `L ${qChest + allowance} ${ahDepth + allowance}`,
    `L ${qHip + allowance} ${targetLength + allowance}`,
    `L -${allowance} ${targetLength + allowance}`,
    `Z`
  ].join(" ");

  // SLEEVE
  let capHeight = (m.chest / 10) + (gender === "male" ? 3 : 2);
  if (sleeveAdj.includes('extra volume') || sleeveAdj.includes('cap')) capHeight += 2;

  const sw = (m.chest / 4) - 2;
  const sleeveLen = m.sleeve;
  
  const upperPath = `M 0 0 
    C ${-sw * 0.5} 0 ${-sw} ${capHeight * 0.3} ${-sw} ${capHeight}
    L ${-sw * 0.9} ${sleeveLen}
    L ${sw * 0.9} ${sleeveLen}
    L ${sw} ${capHeight}
    C ${sw} ${capHeight * 0.3} ${sw * 0.4} 0 0 0 Z`;

  const sleeveSeamPath = `M 0 -${allowance}
    L -${sw + allowance} ${capHeight - allowance}
    L -${sw * 0.9 + allowance} ${sleeveLen + allowance}
    L ${sw * 0.9 + allowance} ${sleeveLen + allowance}
    L ${sw + allowance} ${capHeight - allowance}
    Z`;

  return [
    {
      id: "front",
      name: "Front Bodice",
      path: frontPath,
      seamPath: frontSeamPath,
      labels: [
        { text: "Cut 1 fold", x: qChest/2, y: targetLength / 2 },
        { text: `Chest: ${m.chest}cm`, x: qChest, y: ahDepth },
        { text: `Waist: ${m.waist}cm`, x: qWaist + waistNip, y: waistY },
        { text: `Hip: ${m.hip}cm`, x: qHip, y: hipY },
        { text: `Length: ${Math.round(targetLength)}cm`, x: qHip / 2, y: targetLength + 5 }
      ],
      offset: { x: 0, y: 0 },
      points: [
        { id: 'f-neck-c', x: 0, y: fNeckDepth },
        { id: 'f-neck-s', x: neckWidth, y: 0 },
        { id: 'f-sh-s', x: halfShoulder, y: slope },
        { id: 'f-ah-s', x: qChest, y: ahDepth },
        { id: 'f-w-s', x: qWaist + waistNip, y: waistY },
        { id: 'f-hem-s', x: qHip, y: targetLength },
        { id: 'f-hem-c', x: 0, y: targetLength }
      ]
    },
    {
      id: "back",
      name: "Back Bodice",
      path: backPath,
      seamPath: backSeamPath,
      labels: [
        { text: "Cut 1 fold", x: qChest/2, y: targetLength / 2 },
        { text: `Shoulder: ${m.shoulder}cm`, x: halfShoulder, y: slope - 5 }
      ],
      offset: { x: qChest + 20, y: 0 },
      points: [
        { id: 'b-neck-c', x: 0, y: bNeckDepth },
        { id: 'b-neck-s', x: neckWidth, y: 0 },
        { id: 'b-sh-s', x: halfShoulder, y: slope },
        { id: 'b-ah-s', x: qChest, y: ahDepth },
        { id: 'b-w-s', x: qWaist, y: waistY },
        { id: 'b-hem-s', x: qHip, y: targetLength },
        { id: 'b-hem-c', x: 0, y: targetLength }
      ]
    },
    {
      id: "sleeve",
      name: "Sleeve Block",
      path: upperPath,
      seamPath: sleeveSeamPath,
      labels: [
        { text: "Cut 2", x: 0, y: sleeveLen / 2 },
        { text: `Sleeve: ${sleeveLen}cm`, x: 0, y: sleeveLen + 5 }
      ],
      offset: { x: (qChest + 20) * 2, y: 10 },
      points: [
        { id: 'sl-top', x: 0, y: 0 },
        { id: 'sl-cap-l', x: -sw, y: capHeight },
        { id: 'sl-hem-l', x: -sw * 0.9, y: sleeveLen },
        { id: 'sl-hem-r', x: sw * 0.9, y: sleeveLen },
        { id: 'sl-cap-r', x: sw, y: capHeight }
      ]
    }
  ];
}

