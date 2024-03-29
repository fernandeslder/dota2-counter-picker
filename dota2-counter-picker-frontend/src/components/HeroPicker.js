import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Dota2DataTable from "./Dota2DataTable";
import heroList from "../data/all_hero_names_list.json";
import "./HeroPicker.css";

function HeroPicker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHeroes, setSelectedHeroes] = useState([]);
  const [heroesSelected, setHeroesSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [heroData, setHeroData] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHeroData = async () => {
      if (selectedHeroes.length > 0) {
        setIsLoading(true);
        try {
          const response = await fetch("https://dota2-counter-picker.onrender.com/getHeroData", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ hero_list: selectedHeroes })
          });
          const data = await response.json();
          if (data.status === 'success') {
            setHeroData(data.data);
            setError("");
          } else {
            const message = data.message ? "Error fetching hero data:: " + data.message : "Error fetching hero data. Please try again later.";
            setError(message);
          }
        } catch (error) {
          const message = error.response ? "Error fetching hero data:: " + error.response.data.message : "Error fetching hero data. Please try again later.";
          setError(message);
        }
      } else {
        setError("");
        setHeroData({});
      }
      setIsLoading(false);
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
    } else {
      toast.error('Max 5 heroes can be selected', {
        position: toast.POSITION.BOTTOM_RIGHT,
        autoClose: 3000,
      });
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
      {isLoading && (
        <div className="loading-page">
          <div className="loading-page__message">Loading...</div>
        </div>
      )}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search for a hero"
          value={searchTerm}
          onChange={handleSearchTermChange}
        />
        {searchTerm && (
          <button className="clear-search-button" onClick={() => setSearchTerm("")}>
            x
          </button>
        )}
        {heroesSelected && (
          <button className="clear-button" onClick={clearSelectedHeroes}>
            Clear All Selected Heroes
          </button>
        )}
      </div>
      <div className="hero-list"
        onWheel={(e) => e.currentTarget.scrollBy(e.deltaY, 0)}
        onMouseEnter={() => {
          document.body.style.overflowY = "hidden";
        }}
        onMouseLeave={() => {
          document.body.style.overflowY = "auto";
        }}>
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
      <ToastContainer theme="dark" />
    </div>
  );
}

export default HeroPicker;
