import React, { useState, useEffect, useMemo } from "react";
import _ from "lodash";
import heroList from "../data/all_hero_names_list.json";
import "./HeroPicker.css";

function HeroPicker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHeroes, setSelectedHeroes] = useState([]);
  const [heroesSelected, setHeroesSelected] = useState(false);
  const [heroData, setHeroData] = useState({});

  useEffect(() => {
    const fetchHeroData = async () => {
      if (selectedHeroes.length > 0) {
        const response = await fetch("http://127.0.0.1:5000/getHeroData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ hero_list: selectedHeroes })
        });
        const data = await response.json();
        setHeroData(data.data);
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
      <Dota2Data data={heroData} />
    </div>
  );
}
export default HeroPicker;

function Dota2Data({ data }) {
  const [sortColumn, setSortColumn] = useState("Cumulative Advantage");
  const [sortDirection, setSortDirection] = useState("desc");

  if (!data || Object.keys(data).length === 0) {
    return <div>No data available</div>;
  }

  let columns = Object.keys(data);

  // Move "Cumulative Advantage" to second last position
  if (columns.includes("Cumulative Advantage")) {
    columns = [
      ...columns.filter(col => col !== "Cumulative Advantage"),
      "Cumulative Advantage",
    ];
  }

  // Move "Average Enemy WR" to last position
  if (columns.includes("Average Enemy WR")) {
    columns = [
      ...columns.filter(col => col !== "Average Enemy WR"),
      "Average Enemy WR",
    ];
  }

  // Sort the columns and rows based on the current sort column and direction
  const rows = Object.keys(data[columns[0]])
    .sort((a, b) => {
      const aValue = data[sortColumn][a];
      const bValue = data[sortColumn][b];
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      } else if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      } else {
        return 0;
      }
    })
    .map(row => ({
      key: row,
      values: columns.map(col => data[col][row]),
    }));

  // Handle column click to update the sort column and direction
  const handleColumnClick = column => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th></th>
          {columns.map(col => (
            <th
              key={col}
              onClick={() => handleColumnClick(col)}
              style={{ cursor: "pointer" }}
            >
              {col}
              {col === sortColumn && (
                <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.key}>
            <td>{row.key}</td>
            {row.values.map((value, index) => (
              <td key={index}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
