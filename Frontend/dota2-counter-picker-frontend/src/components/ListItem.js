import React from "react";

function ListItem({ hero, selected, onItemClick }) {
    const handleClick = () => {
      onItemClick(hero);
    };
  
    return (
      <div
        className={`list-item ${selected ? "selected" : ""}`}
        onClick={handleClick}
      >
        <img src={`images/${hero}.jpg`} alt={hero} />
        <div className="hero-name">{hero}</div>
      </div>
    );
  }
  
  export default ListItem;