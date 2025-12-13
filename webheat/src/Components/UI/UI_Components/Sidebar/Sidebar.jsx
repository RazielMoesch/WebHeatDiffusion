

import "./Sidebar.css";


const Sidebar = ({ objectName, sidebarProperties }) => {


    return <>

        <div className="sidebar-container">

            <h1 className="sidebar-title">Object Properties</h1>
            <h2 className="sidebar-object-name">{objectName}</h2>

            <div className="sidebar-input-container">
                {
                    sidebarProperties && sidebarProperties.map((inpt, idx) => (

                        <div key={idx} className="sidebar-input-wrapper">

                            {inpt}

                        </div>
                    ))

                }
            </div>


        </div>
    
    </>

   


} 



export default Sidebar;