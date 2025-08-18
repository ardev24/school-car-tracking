import React, { useState, useEffect, useRef } from 'react';
import { addLocationToQueue, processQueue } from './offlineService';

/* ── CONFIG ─────────────────────────────────────────── */
const POLL_MS = 5_000;  // background point every 5 s
const NORMAL_OPTS = { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 };
const HIGH_OPTS   = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 };
const TARGET_ACC_M = 20;     // want ≤20 m for manual drop-off

/* ── COMPONENT ──────────────────────────────────────── */
function Tracker() {
  const vehicleId = localStorage.getItem('vehicleId');

  /* state */
  const [isTracking, setIsTracking] = useState(false);
  const [status,     setStatus]     = useState('Idle');
  const [accuracy,   setAccuracy]   = useState(null);
  const [dropBusy,   setDropBusy]   = useState(false);

  /* refs */
  const tripIdRef  = useRef(null);
  const watchRef   = useRef(null);
  const pollRef    = useRef(null);
  const wakeRef    = useRef(null);

  /* ───────────────── Wake-lock ───────────────── */
  const lockScreen = async () => {
    try {
      if ('wakeLock' in navigator)
        wakeRef.current = await navigator.wakeLock.request('screen');
    } catch (e) { console.warn('Wake-lock failed', e); }
  };
  const releaseScreen = () => wakeRef.current?.release();

  /* ──────────────── Queue helper ─────────────── */
  const enqueue = (pos, extra = {}) => {
    addLocationToQueue({
      vehicleId,
      tripId: tripIdRef.current,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
      ...extra,
    });
    processQueue(); // send immediately
  };

  /* ─────────────── Background poll ───────────── */
  const startPoll = () => {
    // warm GPS
    watchRef.current = navigator.geolocation.watchPosition(()=>{},()=>{}, NORMAL_OPTS);

    pollRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setAccuracy(pos.coords.accuracy.toFixed(1));
          setStatus('Tracking…');
          enqueue(pos);                         // normal point
        },
        () => setStatus('GPS temporarily unavailable…'),
        NORMAL_OPTS
      );
    }, POLL_MS);
  };

  const stopPoll = () => {
    navigator.geolocation.clearWatch(watchRef.current);
    clearInterval(pollRef.current);
  };

  /* ─────────────── Manual Drop-off ───────────── */
  const MAX_WAIT_MS = 45_000;

  const handleDropOff = () => {
  if (dropBusy) return;
  setDropBusy(true);
  setStatus('Locking GPS…');
  stopPoll();                     // pause normal background polling

  let bestFix = null;
  let bestAcc = Infinity;
  const start  = Date.now();

  /* 1️⃣ Start a high-accuracy watch that streams fixes */
  const wId = navigator.geolocation.watchPosition(
    (pos) => {
      const acc = pos.coords.accuracy;

      /* remember best fix seen so far */
      if (acc < bestAcc) {
        bestAcc = acc;
        bestFix = pos;
        setStatus(`Improving… (±${acc.toFixed(1)} m)`);
      }

      /* stop as soon as we hit target */
      if (acc <= TARGET_ACC_M) finish();
      else if (Date.now() - start > MAX_WAIT_MS) finish(); // or after timeout
    },
    (err) => {
      console.warn('watchPosition error', err);
      if (Date.now() - start > MAX_WAIT_MS) finish();      // bail after timeout
    },
    HIGH_OPTS
  );

  /* 2️⃣ Finish: clear watch, store best fix (if any), resume polling */
  const finish = () => {
    navigator.geolocation.clearWatch(wId);

    if (bestFix) {
      enqueue(bestFix, {
        isManualDropOff: true,
        priority: 1,
        type: 'dropoff',
      });
      setStatus(`Drop-off saved ✅ (±${bestAcc.toFixed(1)} m)`);
    } else {
      setStatus('❌  No GPS – please try again');
    }

    setDropBusy(false);
    startPoll();                  // resume normal background tracking
  };
};
  /* ─────────────── Trip control ─────────────── */
  const startTrip = () => {
    tripIdRef.current = `trip_${Date.now()}`;
    setStatus('Starting…');
    lockScreen();
    startPoll();
    setIsTracking(true);
  };

  const stopTrip = () => {
    stopPoll();
    releaseScreen();
    setIsTracking(false);
    setAccuracy(null);
    setStatus('Stopped.');
  };

  /* ───── Periodic queue flush (backup) ───── */
  useEffect(() => {
    processQueue();
    const id = setInterval(processQueue, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ────────────────── UI ────────────────── */
  return (
    <div style={{padding:'1rem',fontFamily:'sans-serif'}}>
      <h2>📍 School-Bus Tracker</h2>
      <p>Vehicle: <b>{vehicleId}</b></p>
      <p>Status: {status} {accuracy && `(±${accuracy} m)`}</p>

      {!isTracking ? (
        <button onClick={startTrip} style={btnGreen}>Start Trip</button>
      ) : (
        <>
          <button
            onClick={handleDropOff}
            style={btnBlue}
            disabled={dropBusy}
          >
            🛑 Drop-off
          </button>
          <button onClick={stopTrip} style={btnRed}>Stop Trip</button>
        </>
      )}

      <br /><br />
      <button onClick={() => {
        if (!isTracking &&
            window.confirm('Change vehicle?')) {
          localStorage.removeItem('vehicleId');
          window.location.reload();
        }
      }}>
        Change Vehicle
      </button>
    </div>
  );
}

/* ───── simple button styles ───── */
const base = {padding:'18px 28px',fontSize:'20px',margin:'6px',color:'#fff',border:0};
const btnBlue  = {...base,background:'#1976d2'};
const btnGreen = {...base,background:'#2e7d32'};
const btnRed   = {...base,background:'#c62828'};

export default Tracker;