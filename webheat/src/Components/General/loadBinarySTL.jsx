



const loadBinarySTL = async (url) => {

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const data = new DataView(arrayBuffer);

    const numTriangles = data.getUint32(80, true);
    const vertices = new Float32Array(numTriangles * 3 * 3);

    let offset = 84;
    let vertexIndex = 0;

    for (let i = 0; i < numTriangles; i++) {
        offset += 12;


        for (let v = 0; v < 3; v++ ){

            const x = data.getFloat32(offset, true);
            const y = data.getFloat32(offset + 4, true);
            const z = data.getFloat32(offset + 8, true);

            vertices[vertexIndex++] = x;
            vertices[vertexIndex++] = y;
            vertices[vertexIndex++] = z;

            offset += 12;

        }
        
        offset += 2;
        

    }





    return vertices;



}



export default loadBinarySTL;




