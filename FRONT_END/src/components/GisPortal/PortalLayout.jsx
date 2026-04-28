import React from 'react';
import VerticalIconSidebar from './VerticalIconSidebar';
import LocationNavbar from '../Dashboard/LocationNavbar';
import { useAppContext } from '../../context/AppContext';
import './PortalLayout.css';

const PortalLayout = ({
    mapComponent,
    handleCoordinateSearch
}) => {
    const { filters } = useAppContext();

    return (
        <div className="portal-layout">
            <VerticalIconSidebar />

            <main className="portal-main">
                {/* Map exists in the background */}
                <div className="portal-map-viewer">
                    {mapComponent}
                </div>

                {/* Floating Location Navbar */}
                <div className="portal-location-container">
                    <LocationNavbar />
                </div>
            </main>
        </div>
    );
};

export default PortalLayout;
