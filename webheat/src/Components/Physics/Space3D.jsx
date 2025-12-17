



class Space3D {



    constructor(canvasRef, objects, space_initial_temperature, space_heat_diffusivity) {


        this.space_initial_temperature = space_initial_temperature;
        this.space_heat_diffusivity = space_heat_diffusivity;
        this.canvasRef = canvasRef;
        this.objects = objects;
        this.boundaries = objects ? this.computeSpaceBoundaries() : null;
        



        this.voxelized = this.boundaries ? this.createVoxelizedSpace() : null;


    }

    computeSpaceBoundaries() {

        if (!this.objects || this.objects.length === 0) return null;

        let minx = Infinity, miny = Infinity, minz = Infinity;
        let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;


        for (let i = 0; i < this.objects.length; i++) {

            let { min, max } = this.objects[i].aabb;

            if (min.x < minx) minx = min.x;
            if (min.y < miny) miny = min.y;
            if (min.z < minz) minz = min.z;

            if (max.x > maxx) maxx = max.x;
            if (max.y > maxy) maxy = max.y;
            if (max.z > maxz) maxz = max.z;



        }

        return {min: {x: minx, y: miny, z: minz}, max: {x: maxx, y: maxy, z: maxz}};

    }

    createVoxelizedSpace(voxelSize = 0.1) {
        const { min, max } = this.boundaries;

        const nx = Math.ceil((max.x - min.x) / voxelSize);
        const ny = Math.ceil((max.y - min.y) / voxelSize);
        const nz = Math.ceil((max.z - min.z) / voxelSize);

        const temp_grid = new Float32Array(nx * ny * nz);
        const dif_grid = new Float32Array(nx * ny * nz);

        // Fill the entire space with default values
        temp_grid.fill(this.space_initial_temperature);
        dif_grid.fill(this.space_heat_diffusivity);

        for (let objIndex = 0; objIndex < this.objects.length; objIndex++) {
            const obj = this.objects[objIndex];
            const { grid: objGrid, nx: objNx, ny: objNy, nz: objNz, voxelSize: objVoxelSize } = obj.voxelized;

            // Compute offsets from object position to space coordinates
            const offsetX = Math.floor((obj.position.x - min.x) / voxelSize);
            const offsetY = Math.floor((obj.position.y - min.y) / voxelSize);
            const offsetZ = Math.floor((obj.position.z - min.z) / voxelSize);

            for (let i = 0; i < objNx; i++) {
                for (let j = 0; j < objNy; j++) {
                    for (let k = 0; k < objNz; k++) {
                        const objIdx = i + objNx * (j + objNy * k);
                        if (objGrid[objIdx] === 1) {
                            const globalI = i + offsetX;
                            const globalJ = j + offsetY;
                            const globalK = k + offsetZ;


                            if (globalI < 0 || globalI >= nx || globalJ < 0 || globalJ >= ny || globalK < 0 || globalK >= nz)
                                continue;

                            const globalIdx = globalI + nx * (globalJ + ny * globalK);
                            temp_grid[globalIdx] = obj.initial_temperature;
                            dif_grid[globalIdx] = obj.heat_diffusivity;
                        }
                    }
                }
            }
        }

        return { temp: temp_grid, dif: dif_grid, nx, ny, nz, voxelSize, boundaries: this.boundaries };
    }

    update() {
        this.boundaries = this.objects.length !== 0 ? this.computeSpaceBoundaries() : null;
        this.voxelized = this.boundaries ? this.createVoxelizedSpace() : null;
        console.log("Finished Updating Space.");
    }

 



}


export default Space3D;