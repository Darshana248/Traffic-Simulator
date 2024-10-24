const express = require('express');
const app = express();
const port = 5000;

// Traffic generation rates at different time intervals
const trafficRates = {
  '08:00': { A: 50, B: 30, C: 40, D: 20, E: 60 },
  '08:15': { A: 55, B: 35, C: 45, D: 25, E: 65 },
  '08:30': { A: 60, B: 40, C: 50, D: 30, E: 70 },
  '08:45': { A: 55, B: 35, C: 45, D: 25, E: 65 },
};

// Network links with capacity
const links = [
  { from: 'A', to: 'B', capacity: 100, queue: [] },
  { from: 'A', to: 'C', capacity: 80, queue: [] },
  { from: 'B', to: 'D', capacity: 70, queue: [] },
  { from: 'C', to: 'D', capacity: 90, queue: [] },
  { from: 'C', to: 'E', capacity: 100, queue: [] },
  { from: 'D', to: 'E', capacity: 60, queue: [] },
];

// Nodes in the network
const nodes = ['A', 'B', 'C', 'D', 'E'];

// Packet Routing (Shortest Path Algorithm using Dijkstra’s)
function dijkstra(graph, start, end) {
  let distances = {};
  let prev = {};
  let pq = new Set();

  // Initialize distances to Infinity and previous nodes to null
  for (let node of nodes) {
    distances[node] = Infinity;
    prev[node] = null;
  }
  distances[start] = 0;
  pq.add(start);

  while (pq.size > 0) {
    let minNode = null;

    // Find the node with the smallest distance
    for (let node of pq) {
      if (minNode === null || distances[node] < distances[minNode]) {
        minNode = node;
      }
    }

    if (minNode === end) {
      let path = [];
      let currentNode = end;
      while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = prev[currentNode];
      }
      return path; // Return shortest path
    }

    pq.delete(minNode);

    // Check all neighbors of the current node
    for (let link of links) {
      if (link.from === minNode || link.to === minNode) {
        let neighbor = link.from === minNode ? link.to : link.from;
        let newDist = distances[minNode] + 1; // Treat all links as having weight 1

        if (newDist < distances[neighbor]) {
          distances[neighbor] = newDist;
          prev[neighbor] = minNode;
          pq.add(neighbor);
        }
      }
    }
  }
  return null; // No path found
}

// Simulate traffic generation
function generateTraffic(time) {
  const traffic = trafficRates[time];
  if (!traffic) return [];

  let generatedPackets = [];
  for (let node in traffic) {
    for (let i = 0; i < traffic[node]; i++) {
      const destination = nodes[Math.floor(Math.random() * nodes.length)];
      if (node !== destination) {
        generatedPackets.push({ from: node, to: destination });
      }
    }
  }
  return generatedPackets;
}

// Capacity Checking and Queuing (Congestion Control)
function checkCapacity(route) {
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];

    let link = links.find((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from));

    if (link.capacity <= 0) {
      return false; // Link is full
    }
  }
  return true;
}

function updateLinkCapacity(route) {
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];

    let link = links.find(l => (l.from === from && l.to === to) || (l.from === to && l.to === from));

    if (link.capacity > 0) {
      link.capacity -= 1; // Decrease capacity by 1 for each packet
    }
  }
}

// Simulate packet transmission over time with congestion control
app.get('/simulate/:time', (req, res) => {
  const { time } = req.params;
  const packets = generateTraffic(time);

  let results = [];
  for (let packet of packets) {
    let route = dijkstra(links, packet.from, packet.to);
    
    if (!route) {
      results.push(`No route found from ${packet.from} to ${packet.to}`);
    } else if (checkCapacity(route)) {
      updateLinkCapacity(route);  // Adjust link capacities
      results.push(`Packet sent from ${packet.from} to ${packet.to} via route ${route.join(' -> ')}`);
    } else {
      // Handle congestion by queuing the packet
      for (let i = 0; i < route.length - 1; i++) {
        let link = links.find(l => (l.from === route[i] && l.to === route[i + 1]) || (l.from === route[i + 1] && l.to === route[i]));
        link.queue.push(packet); // Queue the packet on the congested link
      }
      results.push(`Packet queued due to congestion from ${packet.from} to ${packet.to}`);
    }
  }

  // Process Queues (release packets when capacity becomes available)
  links.forEach(link => {
    if (link.queue.length > 0 && link.capacity > 0) {
      const releasedPacket = link.queue.shift();
      link.capacity -= 1;
      results.push(`Queued packet released from ${releasedPacket.from} to ${releasedPacket.to}`);
    }
  });


  res.json(results);
});

// Start the server
app.listen(port, () => {
  console.log(`Network simulation server running on http://localhost:${port}`);
});
