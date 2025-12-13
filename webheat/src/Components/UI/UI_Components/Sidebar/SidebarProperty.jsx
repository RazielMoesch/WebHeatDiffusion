

import "./SidebarProperty.css";
import { useRef } from "react";



const SidebarProperty = ({ name, value, setValue, type, unit}) => {

    const inptRef = useRef(null);

    const handleContainerClick = () => {
        if (inptRef.current) {
            inptRef.current.focus();
        }
    }



    return <>
    
    <div className="sidebar-property-container" onClick={handleContainerClick}>

        <p className="sidebar-property-name">{name}</p>
        <input type={type} ref={inptRef} value={value} onChange={(e) => {setValue(e.target.value)}}  className="sidebar-property-input"/>
        <p className="sidebar-property-unit">{unit}</p>




    </div>
    
    
    </>



}


export default SidebarProperty;




