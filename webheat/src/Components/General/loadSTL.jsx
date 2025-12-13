const loadSTL = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder();

    // Check if it's ASCII by reading the first 80 bytes
    const header = textDecoder.decode(arrayBuffer.slice(0, 80)).trim();
    const isASCII = header.startsWith("solid");

    if (isASCII) {
        // ASCII STL
        const text = textDecoder.decode(arrayBuffer);
        const vertexPattern = /vertex\s+([-+]?[\d.eE+-]+)\s+([-+]?[\d.eE+-]+)\s+([-+]?[\d.eE+-]+)/g;
        const vertices = [];
        let match;
        while ((match = vertexPattern.exec(text)) !== null) {
            vertices.push(parseFloat(match[1]));
            vertices.push(parseFloat(match[2]));
            vertices.push(parseFloat(match[3]));
        }
        return new Float32Array(vertices);
    } else {
        // Binary STL
        const data = new DataView(arrayBuffer);
        const numTriangles = data.getUint32(80, true);

        if (numTriangles * 3 * 3 > 1e8) { // sanity check
            throw new Error("STL file too large or corrupted");
        }

        const vertices = new Float32Array(numTriangles * 3 * 3);
        let offset = 84;
        let vertexIndex = 0;

        for (let i = 0; i < numTriangles; i++) {
            offset += 12; // skip normal

            for (let v = 0; v < 3; v++) {
                vertices[vertexIndex++] = data.getFloat32(offset, true);
                vertices[vertexIndex++] = data.getFloat32(offset + 4, true);
                vertices[vertexIndex++] = data.getFloat32(offset + 8, true);
                offset += 12;
            }

            offset += 2; // skip attribute byte count
        }

        return vertices;
    }
};


export default loadSTL;