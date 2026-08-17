import React from 'react';
import Spinner from './ChartSpinner';
import './CardInlineLoader.css';

const CardInlineLoader = ({ message = "Loading data...", color = "#0284c7" }) => {
    return (
        <div className="card-inline-loader">
            <Spinner size={36} color={color} />
            <span className="card-loader-text">{message}</span>
        </div>
    );
};

export default CardInlineLoader;
