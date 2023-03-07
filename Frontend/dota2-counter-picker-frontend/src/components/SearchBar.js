import React from 'react';

const SearchBar = ({ handleSearchChange }) => {
  return (
    <div className="search-bar">
      <input type="text" placeholder="Search heroes..." onChange={handleSearchChange} />
    </div>
  );
}

export default SearchBar;