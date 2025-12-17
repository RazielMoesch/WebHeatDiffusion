import "./UI.css";
import Toolbar from "./UI_Components/Toolbar/Toolbar.jsx";
import WebGPUCanvas from "./UI_Components/WebGPUCanvas.jsx";
import Sidebar from "./UI_Components/Sidebar/Sidebar.jsx";
import SidebarProperty from "./UI_Components/Sidebar/SidebarProperty.jsx";
import ImportButton from "./ImportButton.jsx";
import { useState } from "react";

const UI = ({ objects, setObjects, canvasRef, space }) => {
    
    const [importAlert, setImportAlert] = useState(0);

    
    const selectedIndex = 0; 

    const selectedObject = objects[selectedIndex];

    return (
        <>
            <Toolbar toolButtons={[<ImportButton setObjects={setObjects} setImportAlert={setImportAlert}/>]} />

            <WebGPUCanvas canvasRef={canvasRef} space={space} importAlert={importAlert}/>

            {selectedObject && (
                <Sidebar
                    sidebarProperties={[
                        <SidebarProperty
                            key="name"
                            name="Name:"
                            value={objects[selectedIndex].name}
                            setValue={(newName) => {
                                setObjects((prevObjects) =>
                                    prevObjects.map((obj, i) =>
                                        i === selectedIndex ? { ...obj, name: newName } : obj
                                    )
                                );
                            }}
                            type="text"
                            unit=""
                        />,
                        <SidebarProperty
                            key="temperature"
                            name="Initial Temperature:"
                            value={selectedObject.initial_temperature}
                            setValue={(newTemp) => {
                                setObjects((prevObjects) =>
                                    prevObjects.map((obj, i) =>
                                        i === selectedIndex
                                            ? { ...obj, initial_temperature: parseFloat(newTemp) }
                                            : obj
                                    )
                                );
                            }}
                            type="number"
                            unit="K"
                        />,
                        <SidebarProperty
                            key="diffusivity"
                            name="Heat Diffusivity:"
                            value={selectedObject.heat_diffusivity}
                            setValue={(newDif) => {
                                setObjects((prevObjects) =>
                                    prevObjects.map((obj, i) =>
                                        i === selectedIndex
                                            ? { ...obj, heat_diffusivity: parseFloat(newDif) }
                                            : obj
                                    )
                                );
                            }}
                            type="number"
                            unit={`m^2/s`}
                        />
                    ]}
                />
            )}
        </>
    );
};

export default UI;
