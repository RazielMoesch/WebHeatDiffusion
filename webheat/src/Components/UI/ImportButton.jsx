import { useRef } from "react";
import ToolbarButton from "./UI_Components/Toolbar/ToolbarButton.jsx";
import insertIcon from "../../assets/insert.png";
import loadSTL from "../General/loadSTL.jsx"; // default import
import Object3D from "../Physics/Object3D.jsx";

const ImportButton = ({ setObjects }) => {
    const fileInputRef = useRef(null);

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Pass the File directly to loadSTL
            const vertices = await loadSTL(file);
            const name = prompt("Give the object a name: ")
            const newObj = new Object3D(vertices, { x: 0, y: 0, z: 0 }, 300, 0.01);
            newObj.name = name;
            setObjects(prevObjects => [...prevObjects, newObj]);
        } catch (err) {
            console.error("Failed to load STL:", err);
        }

        event.target.value = null; // reset input
    };

    return (
        <>
            <ToolbarButton
                imgSrc={insertIcon}
                name="Insert"
                callbackFn={handleButtonClick}
            />
            <input
                type="file"
                accept=".stl"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
            />
        </>
    );
};

export default ImportButton;
