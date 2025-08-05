import React, { useState, useEffect, useRef } from 'react';
// Import our new service functions
import { addLocationToQueue, processQueue } from './offlineService';


function Tracker() {
  const vehicleId = localStorage.getItem('vehicleId');
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('Idle');
  
  const watchIdRef = useRef(null);
  const tripIdRef = useRef(null);


  // Effect for location tracking
  useEffect(() => {
    const handleSuccess = (position) => {
      setStatus(`Tracking... Accuracy: ${position.coords.accuracy.toFixed(2)}m`);
      
      const newLocation = {
        vehicleId: vehicleId,
        tripId: tripIdRef.current,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };


      // USE OUR NEW FUNCTION
      addLocationToQueue(newLocation);
    };


    const handleError = (error) => {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    };


    if (isTracking) {
      setStatus('Starting...');
      tripIdRef.current = `trip_${Date.now()}`;


      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 27000
      };


      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    }


    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        setStatus('Stopped.');
      }
    };
  }, [isTracking]);


  // NEW EFFECT: This hook runs the queue processor on a timer
  useEffect(() => {
    // Run processQueue immediately on load, in case there are leftover items
    processQueue(); 


    // Then, set up an interval to run it every 30 seconds
    const intervalId = setInterval(processQueue, 30000);


    // Cleanup: clear the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []); // The empty array [] means this effect runs only once on component mount


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
    // JSX remains exactly the same...
    <div>
      <h1>SMIG School Vehicle</h1>
      <h2>Active User : {vehicleId}</h2>
      <p>Status: {status}</p>


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