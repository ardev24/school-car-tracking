import React, { useState, useEffect, useRef } from 'react';
import { addLocationToQueue, processQueue } from './offlineService';


function Tracker() {
  const vehicleId = localStorage.getItem('vehicleId');
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [lastGoodAccuracy, setLastGoodAccuracy] = useState(null);


  const watchIdRef = useRef(null);
  const tripIdRef = useRef(null);


  useEffect(() => {
    const handleSuccess = (position) => {
      // We got a good location, update the status and accuracy
      const accuracy = position.coords.accuracy.toFixed(2);
      setStatus(`Tracking...`);
      setLastGoodAccuracy(accuracy);
      
      const newLocation = {
        vehicleId: vehicleId,
        tripId: tripIdRef.current,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };


      addLocationToQueue(newLocation);
    };


    const handleError = (error) => {
      // Handle the timeout error gracefully
      let errorMessage = `Error: ${error.message}`;
      if (error.code === error.TIMEOUT) {
        errorMessage = "Searching for GPS signal... (Temporary Timeout)";
      }
      setStatus(errorMessage);
      console.error(error);
    };


    if (isTracking) {
      setStatus('Starting...');
      tripIdRef.current = `trip_${Date.now()}`;


      // --- NEW ROBUST OPTIONS ---
      const options = {
        enableHighAccuracy: true,
        timeout: 60000,         // Increased timeout: 60 seconds
        maximumAge: 10000         // Increased maximumAge: 10 seconds
      };


      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    }


    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        setStatus('Stopped.');
        setLastGoodAccuracy(null);
      }
    };
  }, [isTracking, vehicleId]); // Added vehicleId to dependency array


  useEffect(() => {
    processQueue();
    const intervalId = setInterval(processQueue, 30000);
    return () => clearInterval(intervalId);
  }, []);


  const handleReset = () => {
    if (isTracking) {
      alert("Please stop the current trip before changing vehicles.");
      return;
    }
    if (window.confirm("Are you sure you want to change the vehicle?")) {
      localStorage.removeItem('vehicleId');
      window.location.reload();
    }
  };


  return (
    <div>
      <h1>Continuous Tracker</h1>
      <h2>Tracking for: {vehicleId}</h2>
      {/* Display the accuracy of the last good signal */}
      <p>Status: {status} {lastGoodAccuracy && `(Accuracy: ${lastGoodAccuracy}m)`}</p>


      {!isTracking ? (
        <button onClick={() => setIsTracking(true)} style={{ padding: '20px', fontSize: '20px', margin: '10px' }}>
          Start Trip
        </button>
      ) : (
        <button onClick={() => setIsTracking(false)} style={{ padding: '20px', fontSize: '20px', margin: '10px' }}>
          Stop Trip
        </button>
      )}
      
      <hr />
      <button onClick={handleReset} style={{ marginTop: '20px' }}>Change Vehicle</button>
    </div>
  );
}


export default Tracker;