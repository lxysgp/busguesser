async function main() {
  const routes = await fetch("https://data.busrouter.sg/v1/routes.geojson").then(res => res.json())
  const services = await fetch("https://data.busrouter.sg/v1/services.json").then(res => res.json())
  const stops = await fetch("https://data.busrouter.sg/v1/stops.geojson").then(res => res.json())
  
  console.log(routes)   // routes data
  console.log(services) // services data
  console.log(stops["features"])    // stops data

  const startindex = Math.floor(Math.random() * stops["features"].length)
  const endindex = Math.floor(Math.random() * stops["features"].length)
  
  const startbusstop = {
    number: stops.features[startindex].id,
    location: stops.features[startindex].geometry.coordinates,
    name: stops.features[startindex].properties.name
  }
  const endbusstop = {
    number: stops.features[endindex].id,
    location: stops.features[endindex].geometry.coordinates,
    name: stops.features[endindex].properties.name
  }

  console.log(startbusstop)
  console.log(endbusstop)

  const map = L.map('map').setView([1.3521, 103.8198], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
  L.marker([startbusstop.location[1], startbusstop.location[0]]).addTo(map)
  L.marker([endbusstop.location[1], endbusstop.location[0]]).addTo(map)
}

main()