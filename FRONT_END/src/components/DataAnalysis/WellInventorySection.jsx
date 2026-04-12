import React, { useEffect, useCallback } from 'react';
import { useWellInventoryData } from '../../hooks/data/useWellInventoryData';
import { AquiferProfileCard } from './WellInventory/AquiferProfileCard';
import { WellProfileCard } from './WellInventory/WellProfileCard';
import { RegionalTrendCard } from './WellInventory/RegionalTrendCard';
import './WellInventorySection.css';

const WellInventorySection = ({
    displayRegion,
    displayBlock,
    analysisLevel,
    globalFilters,
    selectedWell,
    selectedFeature,
    clickedLocation,
    isExpanded,
    selectedWellInventory = [],
    onToggleWellInventory = () => { },
    onClearWellInventory = () => { },
    onSetWellInventory = () => { },
    rainfallStations = [],
    aquiferRecords = [],
    yearlyTrends = null,
    nearbyData = null,
    nearbyLoading = false
}) => {
    const {
        loading,
        listData,
        nearbyData: resolvedNearbyData,
        nearbyLoading: resolvedNearbyLoading,
        rainfallData,
        aggregatedChartData,
        totalWells,
        error
    } = useWellInventoryData({
        displayRegion,
        displayBlock,
        globalFilters,
        clickedLocation,
        selectedWell,
        rainfallStations,
        aquiferRecords,
        yearlyTrends,
        nearbyData,
        nearbyLoading
    });

    const isSelected = useCallback((well) => {
        if (!well) return false;
        const lat = well.latitude || well.lat || well.properties?.latitude || well.properties?.lat;
        const lon = well.longitude || well.lng || well.properties?.longitude || well.properties?.lng;

        return selectedWellInventory.some(w => {
            if (well.well_id && w.well_id === well.well_id) return true;

            const wLat = w.latitude || w.lat || w.properties?.latitude || w.properties?.lat;
            const wLng = w.longitude || w.lng || w.properties?.longitude || w.properties?.lng;

            if (lat && lon && wLat && wLng) {
                return Math.abs(lat - wLat) < 0.0001 && Math.abs(lon - wLng) < 0.0001;
            }
            return false;
        });
    }, [selectedWellInventory]);

    useEffect(() => {
        if (selectedWell && !isSelected(selectedWell)) {
            onToggleWellInventory(selectedWell);
        }
    }, [selectedWell, isSelected, onToggleWellInventory]);

    useEffect(() => {
        if (clickedLocation && !nearbyLoading) {
            const { lat, lng: lon } = clickedLocation;
            let currentLoc;

            if (nearbyData) {
                let nearestAquifer = '-';
                if (listData?.length > 0) {
                    let minDist = Infinity;
                    let nearestWell = null;
                    listData.forEach(w => {
                        const wLat = w.latitude || w.lat || w.properties?.latitude || w.properties?.lat;
                        const wLng = w.longitude || w.lng || w.properties?.longitude || w.properties?.lng;
                        if (wLat && wLng) {
                            const dist = (wLat - lat) ** 2 + (wLng - lon) ** 2;
                            if (dist < minDist) {
                                minDist = dist;
                                nearestWell = w;
                            }
                        }
                    });
                    if (nearestWell) nearestAquifer = nearestWell.aquifer || nearestWell.Aquifer || nearestWell.properties?.aquifer || '-';
                }

                currentLoc = {
                    lat, lng: lon,
                    well_id: `Nearby_${lat.toFixed(2)}_${lon.toFixed(2)}`,
                    aquifer: nearestAquifer,
                    ...nearbyData
                };
            } else {
                currentLoc = {
                    lat, lng: lon,
                    well_id: `Unknown_${lat.toFixed(2)}_${lon.toFixed(2)}`,
                    aquifer: 'No Data',
                    averages: {}
                };
            }

            if (!isSelected(currentLoc) && (!selectedWell || (Math.abs(currentLoc.lat - (selectedWell.latitude || selectedWell.lat)) > 0.001))) {
                onToggleWellInventory(currentLoc);
            }
        }
    }, [nearbyData, clickedLocation, nearbyLoading, listData, isSelected, selectedWell, onToggleWellInventory]);


    if (error) return <div className="well-inventory-error animated-entry">{error}</div>;

    return (
        <div className="well-inventory-container">
            {selectedFeature && selectedFeature.type === 'aquifer_feature' ? (
                <AquiferProfileCard
                    selectedFeature={selectedFeature}
                    selectedWellInventory={selectedWellInventory}
                    onToggleWellInventory={onToggleWellInventory}
                    onClearWellInventory={onClearWellInventory}
                />
            ) : selectedWell ? (
                <WellProfileCard
                    selectedWell={selectedWell}
                    rainfallData={rainfallData}
                    isExpanded={isExpanded}
                    selectedWellInventory={selectedWellInventory}
                    onToggleWellInventory={onToggleWellInventory}
                    onClearWellInventory={onClearWellInventory}
                />
            ) : (
                <RegionalTrendCard
                    aggregatedChartData={aggregatedChartData}
                    analysisLevel={analysisLevel}
                    isExpanded={isExpanded}
                    totalWells={totalWells}
                    listDataLength={listData?.length || 0}
                    selectedWellInventory={selectedWellInventory}
                    onToggleWellInventory={onToggleWellInventory}
                    onClearWellInventory={onClearWellInventory}
                />
            )}
        </div>
    );
};

export default WellInventorySection;
