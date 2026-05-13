import type { SpawnBlock } from "./types";

export class WorldBuilder {
  readonly blocks: SpawnBlock[] = [];

  block(x: number, y: number, z: number, typeId: string, protectedBlock = false): void {
    this.blocks.push({ x, y, z, typeId, protected: protectedBlock });
  }

  floor(x1: number, x2: number, z1: number, z2: number, typeId: string, protectedBlock = false): void {
    for (let x = x1; x <= x2; x += 1) {
      for (let z = z1; z <= z2; z += 1) {
        this.block(x, 0, z, typeId, protectedBlock);
      }
    }
  }

  roof(x1: number, x2: number, z1: number, z2: number, y: number, typeId: string): void {
    for (let x = x1; x <= x2; x += 1) {
      for (let z = z1; z <= z2; z += 1) {
        this.block(x, y, z, typeId, true);
      }
    }
  }

  walls(
    x1: number,
    x2: number,
    z1: number,
    z2: number,
    height: number,
    typeId: string,
    protectedBlock = false,
    openings: Array<{ side: "north" | "south" | "east" | "west"; start: number; end: number; maxY: number }> = []
  ): void {
    for (let y = 1; y <= height; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        if (!this.isOpening(openings, "south", x, y)) {
          this.block(x, y, z1, typeId, protectedBlock);
        }
        if (!this.isOpening(openings, "north", x, y)) {
          this.block(x, y, z2, typeId, protectedBlock);
        }
      }
      for (let z = z1 + 1; z <= z2 - 1; z += 1) {
        if (!this.isOpening(openings, "west", z, y)) {
          this.block(x1, y, z, typeId, protectedBlock);
        }
        if (!this.isOpening(openings, "east", z, y)) {
          this.block(x2, y, z, typeId, protectedBlock);
        }
      }
    }
  }

  building(options: {
    x1: number;
    x2: number;
    z1: number;
    z2: number;
    height: number;
    floor: string;
    wall: string;
    roof: string;
    protected?: boolean;
    openings?: Array<{ side: "north" | "south" | "east" | "west"; start: number; end: number; maxY: number }>;
  }): void {
    this.floor(options.x1, options.x2, options.z1, options.z2, options.floor, Boolean(options.protected));
    this.walls(
      options.x1,
      options.x2,
      options.z1,
      options.z2,
      options.height,
      options.wall,
      Boolean(options.protected),
      options.openings
    );
    this.roof(options.x1, options.x2, options.z1, options.z2, options.height + 1, options.roof);
  }

  stripe(x1: number, x2: number, z: number, y: number, typeId: string): void {
    for (let x = x1; x <= x2; x += 1) {
      this.block(x, y, z, typeId, true);
    }
  }

  posts(x1: number, x2: number, z1: number, z2: number, y1: number, y2: number, typeId: string): void {
    for (const [x, z] of [
      [x1, z1],
      [x1, z2],
      [x2, z1],
      [x2, z2]
    ]) {
      for (let y = y1; y <= y2; y += 1) {
        this.block(x, y, z, typeId, true);
      }
    }
  }

  private isOpening(
    openings: Array<{ side: "north" | "south" | "east" | "west"; start: number; end: number; maxY: number }>,
    side: "north" | "south" | "east" | "west",
    coordinate: number,
    y: number
  ): boolean {
    return openings.some(
      (opening) =>
        opening.side === side && coordinate >= opening.start && coordinate <= opening.end && y <= opening.maxY
    );
  }
}
