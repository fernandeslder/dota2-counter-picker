import React, { useState, useEffect } from "react";
import Dota2DataTable from "./Dota2DataTable";
import heroList from "../data/all_hero_names_list.json";
import "./HeroPicker.css";

function HeroPicker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHeroes, setSelectedHeroes] = useState([]);
  const [heroesSelected, setHeroesSelected] = useState(false);
  const [heroData, setHeroData] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHeroData = async () => {
      if (selectedHeroes.length > 0) {
        try {
          const response = await fetch("http://127.0.0.1:5000/getHeroData", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ hero_list: selectedHeroes })
          });
          const data = await response.json();
          setHeroData(data.data);
          setError("");
        } catch (error) {
          setError("Error fetching hero data. Please try again later.");
        }
      } else {
        setHeroData({});
      }
    };
    fetchHeroData();
  }, [selectedHeroes]);

  const handleSearchTermChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleHeroClick = (hero) => {
    if (selectedHeroes.includes(hero)) {
      setSelectedHeroes(selectedHeroes.filter((h) => h !== hero));
      setHeroesSelected(selectedHeroes.length > 1);
      const newHeroData = { ...heroData };
      delete newHeroData[hero];
      setHeroData(newHeroData);
    } else if (selectedHeroes.length < 5) {
      setSelectedHeroes([...selectedHeroes, hero]);
      setHeroesSelected(true);
    }
  };

  const clearSelectedHeroes = () => {
    setSelectedHeroes([]);
    setHeroesSelected(false);
    setHeroData({});
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
        {heroesSelected && (
          <button className="clear-button" onClick={clearSelectedHeroes}>
            Clear All Selected Heroes
          </button>
        )}
      </div>
      <div className="hero-list" onWheel={(e) => e.currentTarget.scrollBy(e.deltaY, 0)}>
        {filteredHeroes.map((hero) => (
          <div
            key={hero}
            onClick={() => handleHeroClick(hero)}
            className={`hero-item ${selectedHeroes.includes(hero) ? "selected" : ""
              }`}
          >
            <img src={`assets/img/${hero}.jpg`} alt={`${hero} portrait`} className="hero-image" />
            <span>{hero}</span>
          </div>
        ))}
      </div>
      {error && <div className="error-message">{error}</div>}
      <Dota2DataTable data={heroData} />
    </div>
  );
}

export default HeroPicker;
