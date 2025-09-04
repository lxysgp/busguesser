async function main() {
  const routes = await fetch("https://data.busrouter.sg/v1/routes.geojson").then(res => res.json())
  const services = await fetch("https://data.busrouter.sg/v1/services.json").then(res => res.json())
  const stops = await fetch("https://data.busrouter.sg/v1/stops.geojson").then(res => res.json())
  
  console.log(routes)   // routes data
  // console.log(services) // services data
  // console.log(stops["features"])    // stops data

  const startindex = Math.floor(Math.random() * stops["features"].length)
  const endindex = Math.floor(Math.random() * stops["features"].length)
  
  const startbusstop = {
    number: stops.features[startindex].id,
    location: stops.features[startindex].geometry.coordinates,
    name: stops.features[startindex].properties.name,
    services: stops.features[startindex].properties.services
  }
  const endbusstop = {
    number: stops.features[endindex].id,
    location: stops.features[endindex].geometry.coordinates,
    name: stops.features[endindex].properties.name,
    services: stops.features[endindex].properties.services
  }

  // console.log(startbusstop.services)
  // console.log(endbusstop.services)

  if (startbusstop.services.some(r => endbusstop.services.includes(r))) {location.reload()}

  const map = L.map('map').setView([1.3521, 103.8198], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
  const startMarker = L.marker([startbusstop.location[1], startbusstop.location[0]]).addTo(map)
  const endMarker = L.marker([endbusstop.location[1], endbusstop.location[0]]).addTo(map)

  startMarker.bindPopup(`
    <div>${startbusstop.name}<br>${showbuses(startbusstop.services)}</div>
  `)
  endMarker.bindPopup(`
    <div>${endbusstop.name}<br>${showbuses(endbusstop.services)}</div>
  `)

  let routepath
  let routeaddedbyclick
  
  startMarker.on("popupopen", attachButtonListeners)
  endMarker.on("popupopen", attachButtonListeners)

  function attachButtonListeners() {
    const buttons = document.querySelectorAll("button")

    buttons.forEach(button => {
      let triggeredbyclick
      button.addEventListener("mouseover", () => {
        routepath = L.geoJSON(getroutepath(button.textContent)).addTo(map)
        triggeredbyclick = false
      })
      button.addEventListener("mouseout", () => {
        if (!triggeredbyclick) {map.removeLayer(routepath)}
      })
      button.addEventListener("click", () => {
        triggeredbyclick = true
        map.closePopup()
      })
    })
  }

  function getroutepath(num) {
    const matches = routes.features.filter(feat => feat.properties.number == num)
    if (matches.length == 0) return null
  
    // Flatten all coordinates into one array
    const multiCoords = matches.map(feat => feat.geometry.coordinates)
  
    return {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: multiCoords
      }
    }
  }
}

function showbuses(array) {
  let result = ""
  array.forEach(bus => {
    result += `<button>${bus}</button>`
  })
  return result
}

main()