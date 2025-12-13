



class Space3D {



    constructor(canvasRef, objects) {

        this.canvasRef = canvasRef;
        this.objects = objects;



    }

    computeSpaceBoundaries() {

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


}


