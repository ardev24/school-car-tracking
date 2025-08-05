import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Import your db instance
import { collection, getDocs } from 'firebase/firestore';


function VehicleSelector() {
  const [vehicles, setVehicles] = useState([]); // State to hold the list of vehicles
  const [loading, setLoading] = useState(true); // State to show a loading message


  // This effect runs once when the component is first rendered
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesCollectionRef = collection(db, 'vehicles');
        const querySnapshot = await getDocs(vehiclesCollectionRef);
        
        const vehiclesList = querySnapshot.docs.map(doc => ({
          id: doc.id, // e.g., "vehicle_01"
          ...doc.data() // e.g., { name: "Blue Bus" }
        }));


        setVehicles(vehiclesList);
      } catch (error) {
        console.error("Error fetching vehicles: ", error);
        // Handle error, maybe show a message to the user
      } finally {
        setLoading(false);
      }
    };


    fetchVehicles();
  }, []); // The empty dependency array [] ensures this runs only once


  const handleSelectVehicle = (vehicleId) => {
    console.log(`Selected vehicle: ${vehicleId}`);
    localStorage.setItem('vehicleId', vehicleId);
    window.location.reload();
  };


  if (loading) {
    return <h1>Loading Vehicles...</h1>;
  }


  return (
    <div>
      <h1>Select Your Vehicle</h1>
      {vehicles.map(vehicle => (
        <button 
          key={vehicle.id} 
          onClick={() => handleSelectVehicle(vehicle.id)} 
          style={{ padding: '20px', fontSize: '20px', margin: '10px', display: 'block' }}
        >
          {vehicle.name}
        </button>
      ))}
    </div>
  );
}


export default VehicleSelector;