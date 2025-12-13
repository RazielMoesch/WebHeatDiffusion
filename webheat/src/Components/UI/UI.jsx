
import "./UI.css"
import Toolbar from "./UI_Components/Toolbar/Toolbar.jsx";
import WebGPUCanvas from "./UI_Components/WebGPUCanvas.jsx";
import Sidebar from "./UI_Components/Sidebar/Sidebar.jsx";



const UI = () => {


    return <>

        <Toolbar />
    
        <WebGPUCanvas/>

        <Sidebar /> 
    
    
    </>
     


}



export default UI;