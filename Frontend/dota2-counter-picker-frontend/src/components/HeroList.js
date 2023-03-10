import { useState } from "react";
import ListItem from "./ListItem";
import heroListData from "../assets/data/all_hero_names_list.json";
import "./HeroList.css";

function HeroList() {
  const [selectedHero, setSelectedHero] = useState("");

  const handleItemClick = (hero) => {
    setSelectedHero(hero);
  };

  return (
    <div className="hero-list">
      {heroListData.map((hero) => (
        <ListItem
          key={hero}
          hero={hero}
          selected={selectedHero === hero}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  );
}

export default HeroList;