import React, { useState } from 'react';
import logo from './logo.jpg';
import './App.css';
import SearchBar from './components/SearchBar';

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
  }
  return (
    <div className="App">
      <body className="App-body">
      <h1><img src={logo} className="App-logo" alt="logo" />&nbsp;Dota 2 Counter Picker</h1>
      <SearchBar handleSearchChange={handleSearchChange} />
      </body>
    </div>
  );
}

export default App;
