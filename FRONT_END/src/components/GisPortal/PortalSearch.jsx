import React, { useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import './PortalSearch.css';

const PortalSearch = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    return (
        <div className="portal-search-container">
            <div className="search-box">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Search Here"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                    <button className="clear-btn" onClick={() => setQuery('')}>
                        <X size={16} />
                    </button>
                )}
                <div className="search-divider"></div>
                <button className="location-picker">
                    <MapPin size={18} />
                </button>
            </div>
        </div>
    );
};

export default PortalSearch;
