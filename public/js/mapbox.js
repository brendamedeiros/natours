/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiYnJuZG1lZGVpcm9zIiwiYSI6ImNrZHQ0cWhwOTB1cm0ydG55NW5rNm50a3UifQ.qB4LbngnItMwCtkh6UhkSA';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/brndmedeiros/ckdt5f45l0y5t19t4xx7t61am',
    scrollZoom: false,
    //   center: [-118.1381459, 34.0798508],
    //   zoom: 10,
    //   interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extends the map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 100,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
