/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Magnet() {

        let active = false;

        function setup(event) {
            const button = document.createElement('button');
            button.innerHTML = '🧲';
            event.toolbar.appendChild(button);
            button.setAttribute('class', 'icon');
            button.addEventListener('click', () => {
                active = !active;
                button.setAttribute('class', active ? 'icon active' : 'icon');
            });
        }

        function draw(event) {
            if (active) {
                const { state, mapValue, parseGeoJSONCoordinates, lerp, getBoundingCircle, isFeaturePoint } = event;
                const { mouse, bounds, width, height } = state;
                const [minx, miny, maxx, maxy] = bounds;
                const mouseCoords = [
                    mapValue(mouse[0], 0, width, minx, maxx),
                    mapValue(mouse[1], height, 0, miny, maxy)
                ];
                event.draw((feature) => {
                    if (feature && feature.boundingCircle) {
                        const [minx, miny, maxx, maxy] = bounds;
                        const center = feature.boundingCircle[0];
                        const x = mapValue(center[0], minx, maxx, 0, width);
                        const y = mapValue(center[1], miny, maxy, height, 0);
                        const distance = event.distance([x, y], mouse);
                        if (distance < 200) {
                            const isPoint = isFeaturePoint(feature);
                            let boundingBox  = [Infinity, Infinity, -Infinity, -Infinity];
                            const coordinates = parseGeoJSONCoordinates(feature, (coords) => {
                                
                                if (isPoint) {
                                    boundingBox = null;
                                }
                                return coords.map((vertex) => {
                                    if (event.distance(vertex, mouseCoords) > 100 * state.resolution) {
                                        if (!isPoint) {
                                            if (vertex[0] < boundingBox[0]) { boundingBox[0] = vertex[0]; }
                                            if (vertex[1] < boundingBox[1]) { boundingBox[1] = vertex[1]; }
                                            if (vertex[0] > boundingBox[2]) { boundingBox[2] = vertex[0]; }
                                            if (vertex[1] > boundingBox[3]) { boundingBox[3] = vertex[1]; }
                                        }
                                        return vertex;
                                    }
                                    const moveCoords = [
                                        lerp(vertex[0], mouseCoords[0], 0.01),
                                        lerp(vertex[1], mouseCoords[1], 0.01)
                                    ];
                                    if (!isPoint) {
                                        if (moveCoords[0] < boundingBox[0]) { boundingBox[0] = moveCoords[0]; }
                                        if (moveCoords[1] < boundingBox[1]) { boundingBox[1] = moveCoords[1]; }
                                        if (moveCoords[0] > boundingBox[2]) { boundingBox[2] = moveCoords[0]; }
                                        if (moveCoords[1] > boundingBox[3]) { boundingBox[3] = moveCoords[1]; }
                                    }
                                    return moveCoords;
                                });
                            });
                            feature.geometry.coordinates = coordinates;
                            if (boundingBox && boundingBox !== Infinity) {
                                feature.boundingBox = boundingBox;
                                feature.boundingCircle = getBoundingCircle(boundingBox);
                            }
                        }
                    }
                });
            }
        }

        this.name = 'magnet';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.magnet = (config) => new Magnet(config);
})();
