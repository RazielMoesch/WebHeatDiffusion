import { useEffect, useState, useRef, useMemo } from "react";
import UI from "./UI/UI";
import Space3D from "../Components/Physics/Space3D.jsx";

const Page = () => {
    const canvasRef = useRef(null);
    const [objects, setObjects] = useState([]);


    const space = useMemo(() => {
        return new Space3D(canvasRef, [], 500, 0.00001);
    }, [canvasRef]);

    useEffect(() => {
        space.objects = objects;
        space.update();
        console.log(objects);
    }, [objects, space]);


    // Add this to Page.jsx for debugging:
    useEffect(() => {
        if (objects.length > 0) {
            const firstObject = objects[0];
            console.log("--- Object Vertices Check ---");
            // Check first 9 values (3 vertices of the first triangle)
            console.log("First 9 Vertices:", Array.from(firstObject.vertices.slice(0, 9)));
            console.log("Total Vertices Length:", firstObject.vertices.length);
            console.log("AABB Min X:", firstObject.aabb.min.x);
            console.log("AABB Max X:", firstObject.aabb.max.x);
            console.log("--- End Check ---");
        }
    }, [objects]);

    return (
        <>
            <UI objects={objects} setObjects={setObjects} canvasRef={canvasRef} space={space}/>
        </>
    );
}

export default Page;