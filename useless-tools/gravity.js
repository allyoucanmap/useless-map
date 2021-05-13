/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Gravity() {

        let active = false;

        function setup(event) {
            const button = document.createElement('button');
            button.innerHTML = '⍖';
            event.toolbar.appendChild(button);
            button.setAttribute('class', 'icon');
            button.addEventListener('click', () => {
                active = !active;
                button.setAttribute('class', active ? 'icon active' : 'icon');
            });
        }

        function draw(event) {
            if (active) {
                const { state, parseGeoJSONCoordinates, getBoundingCircle, isFeaturePoint } = event;
                const { bounds } = state;
                const [minx, miny, maxx, maxy] = bounds;
                event.draw((feature) => {
                    if (feature && feature.boundingCircle) {
                        const center = feature.boundingCircle[0];
                        if (center[1] > miny) {
                            const isPoint = isFeaturePoint(feature);
                            let boundingBox  = [Infinity, Infinity, -Infinity, -Infinity];
                            const coordinates = parseGeoJSONCoordinates(feature, (coords) => {
                                if (isPoint) {
                                    boundingBox = null;
                                }
                                return coords.map((vertex) => {
                                    const moveCoords = [
                                        vertex[0],
                                        vertex[1] - 4 * state.resolution
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

        this.name = 'gravity';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.gravity = (config) => new Gravity(config);
})();
