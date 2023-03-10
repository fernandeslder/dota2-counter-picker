import React, { useState } from "react";
import heroList from "../assets/data/all_hero_names_list.json";
import "./HeroPicker.css";

function HeroPicker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHeroes, setSelectedHeroes] = useState([]);

  const handleSearchTermChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleHeroClick = (hero) => {
    if (selectedHeroes.includes(hero)) {
      setSelectedHeroes(selectedHeroes.filter((h) => h !== hero));
    } else if (selectedHeroes.length < 5) {
      setSelectedHeroes([...selectedHeroes, hero]);
    }
  };

  const filteredHeroes = heroList.filter((hero) =>
    hero.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="hero-picker">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for a hero"
          value={searchTerm}
          onChange={handleSearchTermChange}
        />
      </div>
      <div className="hero-list" onWheel={(e) => e.currentTarget.scrollBy(e.deltaY, 0)}>
        {filteredHeroes.map((hero) => (
          <div
            key={hero}
            onClick={() => handleHeroClick(hero)}
            className={`hero-item ${
              selectedHeroes.includes(hero) ? "selected" : ""
            }`}
          >
            {hero}
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeroPicker;
