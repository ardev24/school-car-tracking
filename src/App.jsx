import React, { useState, useEffect } from 'react';
import Tracker from './Tracker';
import VehicleSelector from './VehicleSelector';
import './App.css';


function App() {
  // Check localStorage on initial load
  const [vehicleId, setVehicleId] = useState(() => localStorage.getItem('vehicleId'));


  if (vehicleId) {
    // If a vehicle is already selected, show the main tracker
    return <Tracker />;
  } else {
    // Otherwise, force the user to select a vehicle
    return <VehicleSelector />;
  }
}


export default App;