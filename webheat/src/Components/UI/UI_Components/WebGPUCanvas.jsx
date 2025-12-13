

import { useEffect, useRef } from "react";
import "./WebGPUCanvas.css";


const WebGPUCanvas = () => {


    const canvas = useRef(null);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

   



    return <>
    
    
    <canvas className="webgpu-canvas">



    </canvas>
    
    </>

}


export default WebGPUCanvas;