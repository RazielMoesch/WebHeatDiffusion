import "./Toolbar.css";

const Toolbar = ({ toolButtons }) => {
  return (
    <div className="toolbar-container">

      <h1
      className="webphysics-toolbar-title"
      >WebPhysics</h1>

      <div className="toolbar-buttons-container">
          {toolButtons && toolButtons.map((btn, index) => (
            <div className="toolbar-button-wrapper" key={index}>
              
              {btn}
              <div className="button-bar" />
            </div>
          ))}

      </div>
      
    </div>
  );
};

export default Toolbar;

