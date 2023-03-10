import React, { useState } from "react";

const HeroListItem = ({ name }) => {
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = () => {
    setIsSelected(!isSelected);
  };

  const thumbnailSrc = `../assets/images/${name}.jpg`;

  return (
    <div
      style={{
        width: "100px",
        height: "100px",
        margin: "10px",
        backgroundColor: isSelected ? "gray" : "white",
        border: isSelected ? "2px solid black" : "1px solid black",
        borderRadius: "5px",
        textAlign: "center",
        cursor: "pointer",
      }}
      onClick={handleClick}
    >
      <img
        src={thumbnailSrc}
        alt={name}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
      <div>{name}</div>
    </div>
  );
};

export default HeroListItem;