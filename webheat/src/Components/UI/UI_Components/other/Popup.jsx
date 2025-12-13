
import "./Popup.css";

const Popup = ({ width="50%", height="50%", children }) => {


    return <>
    
        <div className="popup-container" style={{width: width, height:height }}>

            {children}


        </div>

    </>


}



export default Popup;


