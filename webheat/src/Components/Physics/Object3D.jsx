



class Object3D {


    constructor(vertices, position, initial_temperature, heat_diffusivity) {

        //geometry & loading characteristics
        this.vertices = vertices;
        this.position = position;
        this.aabb = this.computeAABB();
        this.voxelized = this.computeVoxels();

        this.initial_temperature = initial_temperature;
        this.heat_diffusivity = heat_diffusivity;




        // color info
        this.fragmentShader = null;
        this.r = .8;
        this.g = .8;
        this.b = .8;
        this.a = 1.0;


    }

    setColor(r, g, b, a) {

        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;

    }

    setCustomFragmentShader(fragmentShader) {

        this.fragmentShader = fragmentShader;

    }

    computeAABB() {



        let minx = Infinity, miny = Infinity, minz = Infinity;
        let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;

        for (let i = 0; i < this.vertices.length; i+=3) {
            const x = this.vertices[i], y = this.vertices[i+1], z = this.vertices[i+2];

            if ( x < minx ) minx = x;
            if ( y < miny ) miny = y;
            if ( z < minz ) minz = z;

            if ( x > maxx ) maxx = x;
            if ( y > maxy ) maxy = y;
            if ( z > maxz ) maxz = z;

            

        }

        if (minx === Infinity || miny === Infinity || minz === Infinity) {
            console.log(`Problem creating AABB for ${this}. Mins not found. Problem likely lies with the vertex info parsed.`); 
            return;
        }

        return { min: {x: minx, y: miny, z: minz}, max: {x: maxx, y: maxy, z: maxz}};

    }

    computeVoxels(voxelSize = 0.1) {
        
        const { min, max } = this.aabb;

        const nx = Math.ceil((max.x - min.x) / voxelSize);
        const ny = Math.ceil((max.y - min.y) / voxelSize);
        const nz = Math.ceil((max.z - min.z) / voxelSize);

        const grid = new Uint8Array(nx * ny * nz); // 0 = empty, 1 = inside


        for (let t = 0; t < this.vertices.length; t += 9) {
            const tri = [
                [this.vertices[t], this.vertices[t+1], this.vertices[t+2]],
                [this.vertices[t+3], this.vertices[t+4], this.vertices[t+5]],
                [this.vertices[t+6], this.vertices[t+7], this.vertices[t+8]]
            ];

            const triMin = [
                Math.min(tri[0][0], tri[1][0], tri[2][0]),
                Math.min(tri[0][1], tri[1][1], tri[2][1]),
                Math.min(tri[0][2], tri[1][2], tri[2][2])
            ];

            const triMax = [
                Math.max(tri[0][0], tri[1][0], tri[2][0]),
                Math.max(tri[0][1], tri[1][1], tri[2][1]),
                Math.max(tri[0][2], tri[1][2], tri[2][2])
            ];

            const iMin = Math.floor((triMin[0] - min.x) / voxelSize);
            const jMin = Math.floor((triMin[1] - min.y) / voxelSize);
            const kMin = Math.floor((triMin[2] - min.z) / voxelSize);

            const iMax = Math.floor((triMax[0] - min.x) / voxelSize);
            const jMax = Math.floor((triMax[1] - min.y) / voxelSize);
            const kMax = Math.floor((triMax[2] - min.z) / voxelSize);

            for (let i = iMin; i <= iMax; i++) {
                for (let j = jMin; j <= jMax; j++) {
                    for (let k = kMin; k <= kMax; k++) {
                        if (i >= 0 && i < nx && j >= 0 && j < ny && k >= 0 && k < nz) {
                            grid[i + nx*(j + ny*k)] = 1; 
                        }
                    }
                }
            }
        }


        for (let j = 0; j < ny; j++) {
            for (let k = 0; k < nz; k++) {
                let inside = false;
                for (let i = 0; i < nx; i++) {
                    const idx = i + nx*(j + ny*k);
                    if (grid[idx] === 1) inside = !inside; 
                    if (inside) grid[idx] = 1;
                }
            }
        }

        return { grid, nx, ny, nz, voxelSize, aabb: this.aabb };
    }

}


export default Object3D;