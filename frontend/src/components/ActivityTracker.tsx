import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { BASE_BACKEND_URL } from '../contexts/AppProvider';

interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// interface Session {
//   _id: string;
//   movement_data: {
//     gps_logs: Location[];
//     steps: number;
//     distance: number;
//   };
// }

export const ActivityTracker: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string>('');
  const [activity, setActivity] = useState({
    distance: 0,
    duration: 0,
    steps: 0
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const {address} = useAccount();
  // const [wallet_address, setWalletAddress] = useState<string>('');

  useEffect(() => {
    if (isTracking) {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp
          };

          setLocations(prev => [...prev, newLocation]);
          updateActivity(newLocation);
        },
        (error) => {
          setError('Unable to get your location');
          console.error(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isTracking]);

  const startSession = async () => {
    try {
      const response = await fetch(`${BASE_BACKEND_URL}/api/activity/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pool_id: groupId,
          wallet_address: address
        })
      });
      const data = await response.json();
      setSessionId(data._id);
      setIsTracking(true);
    } catch (error) {
      setError('Failed to start activity session');
      console.error(error);
    }
  };

  const updateActivity = async (newLocation: Location) => {
    if (!sessionId) return;

    const newDistance = calculateDistance(locations[locations.length - 1], newLocation);
    const newSteps = Math.floor(newDistance * 1300);

    try {
      await fetch(`${BASE_BACKEND_URL}/api/activity/${sessionId}/movement`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gps_logs: [newLocation],
          steps: newSteps
        })
      });

      setActivity(prev => ({
        distance: prev.distance + newDistance,
        duration: (newLocation.timestamp - locations[0]?.timestamp) / 1000 || 0,
        steps: prev.steps + newSteps
      }));
    } catch (error) {
      console.error('Failed to update movement data:', error);
    }
  };

  const calculateDistance = (loc1?: Location, loc2?: Location): number => {
    if (!loc1 || !loc2) return 0;
    // Haversine formula implementation
    const R = 6371e3; // Earth's radius in meters
    const φ1 = loc1.latitude * Math.PI / 180;
    const φ2 = loc2.latitude * Math.PI / 180;
    const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleFinish = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`${BASE_BACKEND_URL}/api/activity/${sessionId}/end`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      setIsTracking(false);



      const proofHash = data.proof_hash;
      console.log('proofHash', proofHash)
      // await validateActivityOnChain(proofHash, response.data.movement_data);

      navigate(`/performance/${groupId}`);
    } catch (error) {
      setError('Failed to end activity session');
      console.error(error);
    }
  };

  const handleStartStop = () => {
    if (isTracking) {
      handleFinish();
    } else {
      startSession();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-xl p-6 shadow-md">
        {error ? (
          <div className="text-red-500 text-center p-4">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  {isTracking ? 'Running...' : 'Ready to Run?'}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-600">Distance</p>
                  <p className="text-xl font-bold">
                    {(activity.distance / 1000).toFixed(2)} km
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Duration</p>
                  <p className="text-xl font-bold">
                    {Math.floor(activity.duration / 60)}:{(activity.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Steps</p>
                  <p className="text-xl font-bold">{activity.steps}</p>
                </div>
              </div>

              <button
                onClick={handleStartStop}
                className={`w-full py-3 rounded-full font-semibold ${isTracking
                    ? 'bg-red-500 text-white'
                    : 'bg-purple-600 text-white'
                  }`}
              >
                {isTracking ? 'Finish Activity' : 'Start Running'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};