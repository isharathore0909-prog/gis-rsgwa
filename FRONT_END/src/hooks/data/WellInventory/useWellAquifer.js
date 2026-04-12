import { useState, useEffect, useRef } from 'react';
import api from '../../../api';

export const useWellAquifer = ({
    displayRegion,
    displayBlock,
    globalFilters,
    clickedLocation,
    selectedWell,
    aquiferRecords: passedRecords = [],
    yearlyTrends: passedTrends = null,
    nearbyData: passedNearby = null,
    nearbyLoading: passedNearbyLoading = false
}) => {
    const [loading, setLoading] = useState(true);
    const [listData, setListData] = useState([]);
    const [nearbyData, setNearbyData] = useState(null);
    const [nearbyLoading, setNearbyLoading] = useState(false);
    const [regionalStats, setRegionalStats] = useState(null);
    const [yearlyTrends, setYearlyTrends] = useState(null);
    const [error, setError] = useState(null);

    const lastFetchParams = useRef({ displayRegion, displayBlock, globalFilters });
    const lastClickedLoc = useRef(clickedLocation);

    // Sync from passed props if available
    useEffect(() => {
        if (passedRecords?.length > 0) {
            setListData(passedRecords);
            setLoading(false);
        }
    }, [passedRecords]);

    useEffect(() => {
        if (passedTrends) setYearlyTrends(passedTrends);
    }, [passedTrends]);

    useEffect(() => {
        if (passedNearby || passedNearbyLoading) {
            setNearbyData(passedNearby);
            setNearbyLoading(passedNearbyLoading);
        }
    }, [passedNearby, passedNearbyLoading]);

    if (
        lastFetchParams.current.displayRegion !== displayRegion ||
        lastFetchParams.current.displayBlock !== displayBlock ||
        lastFetchParams.current.gramPanchayat !== globalFilters?.gramPanchayat ||
        lastFetchParams.current.village !== globalFilters?.village
    ) {
        // Only set loading if we don't have passed data
        if (!loading && passedRecords?.length === 0) setLoading(true);
        lastFetchParams.current = {
            displayRegion,
            displayBlock,
            gramPanchayat: globalFilters?.gramPanchayat,
            village: globalFilters?.village
        };
    }

    if (clickedLocation !== lastClickedLoc.current) {
        if (clickedLocation && !selectedWell && !passedNearby && !passedNearbyLoading) {
            if (!nearbyLoading) setNearbyLoading(true);
        }
        lastClickedLoc.current = clickedLocation;
    }

    useEffect(() => {
        let ignore = false;
        // Skip fetch if data is already passed from consolidated source
        if (passedRecords?.length > 0) return;

        // Skip individual records fetch for regional overview (State/District level)
        // unless a block or specific filters are provided.
        // This avoids loading 100+ redundant records for the initial sidebar view.
        const isGranular = displayBlock || globalFilters?.gramPanchayat || globalFilters?.village;
        if (!isGranular && (displayRegion === 'RAJASTHAN' || !displayRegion)) {
            setListData([]);
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = { detailed: 'true' };
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.gp_id = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                const response = await api.aquifer.getRecords(params);

                if (!ignore) {
                    const records = Array.isArray(response) ? response : (response.results || []);
                    setListData(records);
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching well inventory:", err);
                    setError("Failed to load well inventory data.");
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchData();
        return () => { ignore = true; };
    }, [displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, passedRecords?.length]);

    useEffect(() => {
        let ignore = false;
        if (!clickedLocation || selectedWell || passedNearby || passedNearbyLoading) {
            if (passedNearby || passedNearbyLoading) {
                setNearbyData(passedNearby);
                setNearbyLoading(passedNearbyLoading);
            } else {
                setNearbyData(null);
            }
            return;
        }

        const fetchNearbyData = async () => {
            setNearbyLoading(true);
            try {
                const response = await api.aquifer.getNearby({
                    latitude: clickedLocation.lat,
                    longitude: clickedLocation.lng,
                    radius_km: 10
                });

                if (!ignore) {
                    setNearbyData(response && response.averages ? response : null);
                }
            } catch (err) {
                if (!ignore) {
                    console.error("Error fetching nearby aquifer data:", err);
                    setNearbyData(null);
                }
            } finally {
                if (!ignore) setNearbyLoading(false);
            }
        };

        fetchNearbyData();
        return () => { ignore = true; };
    }, [clickedLocation, selectedWell, passedNearby, passedNearbyLoading]);

    useEffect(() => {
        let ignore = false;
        // Skip fetch if trends are passed
        if (passedTrends) return;

        const fetchRegionalData = async () => {
            try {
                const params = {};
                if (displayRegion) params.district = displayRegion;
                if (displayBlock) params.block = displayBlock;
                if (globalFilters?.gramPanchayat) params.gp_id = globalFilters.gramPanchayat;
                if (globalFilters?.village) params.village_name = globalFilters.village;

                const [stats, trends] = await Promise.all([
                    api.aquifer.getStatistics(params),
                    api.aquifer.getYearlyStatistics(params)
                ]);

                if (!ignore) {
                    setRegionalStats(stats);
                    setYearlyTrends(trends);
                }
            } catch (err) {
                console.error("Error fetching regional aquifer stats:", err);
            }
        };

        fetchRegionalData();
        return () => { ignore = true; };
    }, [displayRegion, displayBlock, globalFilters?.gramPanchayat, globalFilters?.village, passedTrends]);

    return { loading, listData, nearbyData, nearbyLoading, regionalStats, yearlyTrends, error };
};
