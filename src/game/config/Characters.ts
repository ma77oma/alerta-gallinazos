export type HairStyle = 'bald' | 'short' | 'big';
export type BeardStyle = 'none' | 'stache' | 'goatee' | 'full';
export type NoseSize = 'normal' | 'big';
/**
 * 'crazyMask' replaces the normal hair/face/beard with a wacky green party
 * mask (swept pointy "hair", huge grin) — a generic loco-mask look, not a
 * 1:1 copy of any specific copyrighted character design.
 * 'frozenFace' keeps the normal hair but locks the expression to a calm,
 * unmoving stare regardless of pose (even when hurt) for a deadpan look.
 */
export type SpecialLook = 'none' | 'crazyMask' | 'frozenFace';
export type ShirtPrint = 'none' | 'fish' | 'racing';

export interface PlayerLayout {
  headR: number;
  headCy: number;
  torsoY: number;
  torsoH: number;
  torsoW: number;
  legY: number;
  legLen: number;
  shoeY: number;
  shoeH: number;
  canvasW: number;
  canvasH: number;
  cx: number;
  gunOffsetX: number;
  gunOffsetY: number;
}

export interface CharacterDef {
  id: string;
  label: string;
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
  shoe: number;
  hairStyle: HairStyle;
  beard: BeardStyle;
  glasses: boolean;
  noseSize: NoseSize;
  special: SpecialLook;
  scar: boolean;
  shirtPrint: ShirtPrint;
  layout: PlayerLayout;
}

/**
 * Derives a full body layout (head/torso/leg geometry + gun anchor point)
 * from just a handful of proportions, so each character only needs to
 * tune headR/torsoW/torsoH/legLen/hairPad instead of a dozen raw offsets.
 */
function layout(headR: number, torsoW: number, torsoH: number, legLen: number, hairPad = 8): PlayerLayout {
  const headCy = hairPad + headR;
  const torsoY = headCy + headR - 6;
  const torsoBottom = torsoY + torsoH;
  const legY = torsoBottom - 4;
  const shoeH = 10;
  const shoeY = legY + legLen - 6;
  const canvasH = shoeY + shoeH + 6;
  const canvasW = Math.max(torsoW + 32, headR * 2 + 26);
  const gunOffsetY = torsoY + torsoH * 0.3 - canvasH / 2;
  const gunOffsetX = torsoW * 0.22;
  return {
    headR,
    headCy,
    torsoY,
    torsoH,
    torsoW,
    legY,
    legLen,
    shoeY,
    shoeH,
    canvasW,
    canvasH,
    cx: canvasW / 2,
    gunOffsetX,
    gunOffsetY,
  };
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'clasico',
    label: 'Kingteka',
    skin: 0xe0a878,
    hair: 0x1a1a1a,
    shirt: 0x3a7fc4,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'stache',
    glasses: false,
    noseSize: 'normal',
    special: 'none',
    scar: false,
    shirtPrint: 'none',
    layout: layout(20, 52, 46, 30, 8),
  },
  {
    id: 'chato',
    label: 'Axel Bemba',
    skin: 0x8a5a3a,
    hair: 0x1a1a1a,
    shirt: 0x3a8f5a,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'bald',
    beard: 'none',
    glasses: false,
    noseSize: 'normal',
    special: 'none',
    scar: false,
    shirtPrint: 'none',
    layout: layout(21, 54, 38, 20, 6),
  },
  {
    id: 'grandote',
    label: 'Charles',
    skin: 0x6b4023,
    hair: 0x3a2a1a,
    shirt: 0x8a3a3a,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'big',
    beard: 'full',
    glasses: false,
    noseSize: 'normal',
    special: 'none',
    scar: false,
    shirtPrint: 'none',
    layout: layout(22, 64, 54, 34, 16),
  },
  {
    id: 'lentes',
    label: 'Najasor',
    skin: 0xe8c39a,
    hair: 0x1a1a1a,
    shirt: 0x3aa08f,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'none',
    glasses: true,
    noseSize: 'normal',
    special: 'crazyMask',
    scar: false,
    shirtPrint: 'none',
    layout: layout(18, 42, 48, 34, 20),
  },
  {
    id: 'narizon',
    label: 'Pnkz',
    skin: 0xe0a878,
    hair: 0x4a3a2a,
    shirt: 0xd98a3a,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'none',
    glasses: false,
    noseSize: 'big',
    special: 'none',
    scar: false,
    shirtPrint: 'none',
    layout: layout(19, 44, 48, 34, 8),
  },
  {
    id: 'cevichero',
    label: 'Cevichero',
    skin: 0x7a4a2a,
    hair: 0x1a1a1a,
    shirt: 0x2a8fc4,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'stache',
    glasses: false,
    noseSize: 'normal',
    special: 'none',
    scar: true,
    shirtPrint: 'fish',
    layout: layout(19, 50, 40, 22, 8),
  },
  {
    id: 'turbo',
    label: 'Cirilo',
    skin: 0x8a5a34,
    hair: 0x1a1a1a,
    shirt: 0xd93030,
    pants: 0x1a1a2a,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'none',
    glasses: false,
    noseSize: 'normal',
    special: 'none',
    scar: false,
    shirtPrint: 'racing',
    layout: layout(21, 60, 52, 32, 10),
  },
  {
    id: 'fuzo',
    label: 'Fuzo',
    skin: 0xf2ece0,
    hair: 0x3a3a3a,
    shirt: 0x5a6a7a,
    pants: 0x2c3e50,
    shoe: 0x1a1a1a,
    hairStyle: 'short',
    beard: 'none',
    glasses: false,
    noseSize: 'normal',
    special: 'frozenFace',
    scar: false,
    shirtPrint: 'none',
    layout: layout(27, 58, 50, 32, 16),
  },
];

export const DEFAULT_CHARACTER_ID = 'clasico';

export function getCharacterById(id: string | null | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
