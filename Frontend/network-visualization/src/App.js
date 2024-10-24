import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function App() {
  const [trafficData, setTrafficData] = useState([]);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [stats, setStats] = useState({});
  
  const times = ['08:00', '08:15', '08:30', '08:45'];

  // Fetch traffic data from the backend based on the selected time
  const fetchTrafficData = async (time) => {
    try {
      const response = await axios.get(`/simulate/${time}`); // No need to specify localhost:5000
      setTrafficData(response.data);
      processStats(response.data); // Process for real-time visualization
    } catch (error) {
      console.error("Error fetching traffic data:", error);
    }
  };
  

  // Process stats and store in the state (for node/link/queue visualization)
  const processStats = (data) => {
    let nodeStats = {
      A: { generated: 0, inQueue: 0 },
      B: { generated: 0, inQueue: 0 },
      C: { generated: 0, inQueue: 0 },
      D: { generated: 0, inQueue: 0 },
      E: { generated: 0, inQueue: 0 },
    };

    let linkLoad = {
      'A-B': 0,
      'A-C': 0,
      'B-D': 0,
      'C-D': 0,
      'C-E': 0,
      'D-E': 0,
    };

    data.forEach((packet) => {
      nodeStats[packet.from].generated += 1;
      
      if (packet.status === 'queued') {
        nodeStats[packet.from].inQueue += 1;
      }
      
      // Assume packet.route is a list of nodes like ['A', 'B', 'D', 'E']
      if (packet.route) {
        for (let i = 0; i < packet.route.length - 1; i++) {
          const link = `${packet.route[i]}-${packet.route[i + 1]}`;
          if (linkLoad[link] !== undefined) {
            linkLoad[link] += 1;
          }
        }
      }
    });

    setStats({ nodeStats, linkLoad });
  };

  // Effect to fetch data whenever the selected time changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchTrafficData(selectedTime);
      } catch (error) {
        console.error('Error fetching traffic data:', error);
      }
    };
    
    fetchData();
  }, [selectedTime]);
  
  // Generate a chart data for the node statistics
  const generateChartData = () => {
    return {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [
        {
          label: 'Generated Traffic (packets/sec)',
          data: Object.keys(stats.nodeStats || {}).map(
            (node) => stats.nodeStats[node].generated
          ),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
        {
          label: 'Queued Packets',
          data: Object.keys(stats.nodeStats || {}).map(
            (node) => stats.nodeStats[node].inQueue
          ),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
      ],
    };
  };

  return (
    <div className="App">
      <h1>Network Traffic Visualization</h1>
      
      {/* Time Selector */}
      <div>
        <label>Select Time:</label>
        <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
          {times.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      {/* Node Traffic and Queue Stats */}
      <div style={{ width: '600px', margin: '50px auto' }}>
        <Line data={generateChartData()} />
      </div>

      {/* Link Load */}
      <div>
        <h2>Link Load (packets/sec)</h2>
        {Object.keys(stats.linkLoad || {}).map((link) => (
          <div key={link}>
            {link}: {stats.linkLoad[link]} packets
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
