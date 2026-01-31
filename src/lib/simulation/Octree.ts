export class Point {
  x: number;
  y: number;
  z: number;
  userData: any;

  constructor(x: number, y: number, z: number, userData?: any) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.userData = userData;
  }
}

export class Box {
  x: number;
  y: number;
  z: number;
  w: number; // width (half-width from center in actually usually, or full width? let's use half-dimension for standard octree)
  h: number; // height (half)
  d: number; // depth (half)

  constructor(x: number, y: number, z: number, w: number, h: number, d: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    this.h = h;
    this.d = d;
  }

  contains(point: Point): boolean {
    return (
      point.x >= this.x - this.w &&
      point.x < this.x + this.w &&
      point.y >= this.y - this.h &&
      point.y < this.y + this.h &&
      point.z >= this.z - this.d &&
      point.z < this.z + this.d
    );
  }

  intersects(range: Box): boolean {
    return !(
      range.x - range.w > this.x + this.w ||
      range.x + range.w < this.x - this.w ||
      range.y - range.h > this.y + this.h ||
      range.y + range.h < this.y - this.h ||
      range.z - range.d > this.z + this.d ||
      range.z + range.d < this.z - this.d
    );
  }
}

export class Octree {
  boundary: Box;
  capacity: number;
  points: Point[];
  divided: boolean;
  children: Octree[];

  constructor(boundary: Box, capacity: number) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
    this.children = [];
  }

  subdivide() {
    const { x, y, z, w, h, d } = this.boundary;
    const nw = w / 2;
    const nh = h / 2;
    const nd = d / 2;

    const positions = [
      new Box(x - nw, y - nh, z - nd, nw, nh, nd),
      new Box(x + nw, y - nh, z - nd, nw, nh, nd),
      new Box(x - nw, y + nh, z - nd, nw, nh, nd),
      new Box(x + nw, y + nh, z - nd, nw, nh, nd),
      new Box(x - nw, y - nh, z + nd, nw, nh, nd),
      new Box(x + nw, y - nh, z + nd, nw, nh, nd),
      new Box(x - nw, y + nh, z + nd, nw, nh, nd),
      new Box(x + nw, y + nh, z + nd, nw, nh, nd)
    ];

    this.children = positions.map((b) => new Octree(b, this.capacity));
    this.divided = true;
  }

  insert(point: Point): boolean {
    if (!this.boundary.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    for (const child of this.children) {
      if (child.insert(point)) {
        return true;
      }
    }

    return false; // Should not happen if boundary contains point
  }

  query(range: Box, found: Point[] = []): Point[] {
    if (!this.boundary.intersects(range)) {
      return found;
    }

    for (const p of this.points) {
      if (range.contains(p)) {
        found.push(p);
      }
    }

    if (this.divided) {
      for (const child of this.children) {
        child.query(range, found);
      }
    }

    return found;
  }
}
