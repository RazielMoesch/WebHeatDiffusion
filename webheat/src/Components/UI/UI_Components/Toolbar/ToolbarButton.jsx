


import "./ToolbarButton.css";


const ToolbarButton = ({ imgSrc, name, callbackFn }) => {




    return <>
    
        <div className="toolbar-button-container">

            <button 
                className="toolbar-button"
                onClick={() => callbackFn()}
                >
                    {imgSrc && <img src={imgSrc} alt="" className="toolbar-button-icon"/>}
                    {name}
            </button>

        </div>
        
    
    
    </>



}


export default ToolbarButton;



