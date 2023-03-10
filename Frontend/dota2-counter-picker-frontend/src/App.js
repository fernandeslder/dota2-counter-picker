import React, { useState } from 'react';
import logo from './logo.jpg';
import './App.css';
import SearchBar from './components/SearchBar';
import HeroList from "./components/HeroList";

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  }
  return (
    <div className="App">
      <h1><img src={logo} className="App-logo" alt="logo" />&nbsp;Dota 2 Counter Picker</h1>
      <SearchBar handleSearchChange={handleSearchChange} />
      <HeroList />
    </div>
  );
}

export default App;
