/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {

    function UselessMap(config) {

        const tools = [];

        const EARTH_RADIUS = 6378137.0;
        const EARTH_CIRCUMFERENCE = 2 * Math.PI * EARTH_RADIUS;
        const HALF_EARTH_CIRCUMFERENCE = EARTH_CIRCUMFERENCE / 2;
        const QUARTER_EARTH_CIRCUMFERENCE = EARTH_CIRCUMFERENCE / 4;

        const mapValue = (val, v1, v2, v3, v4) => v3 + (v4 - v3) * ((val - v1) / (v2 - v1));
        const lerp = (a, b, am) => a + (b - a) * am;

        function distance(start, end) {
            return Math.sqrt(Math.pow(start[0] - end[0], 2) + Math.pow(start[1] - end[1], 2));
        }

        function getPosition(event) {
            const { x, y } = container.getBoundingClientRect();
            const { clientX, clientY } = event.touches && event.touches[0] || event;
            return [ clientX - x, clientY - y ];
        }

        function llToProjection([lng, lat]) {
            return [
                mapValue(lng, -180, 180, -HALF_EARTH_CIRCUMFERENCE, HALF_EARTH_CIRCUMFERENCE),
                mapValue(lat, -90, 90, -QUARTER_EARTH_CIRCUMFERENCE, QUARTER_EARTH_CIRCUMFERENCE)
            ];
        }

        const container = document.querySelector(config.target);
        container.style.position = 'relative';
        const containerClassName = container.getAttribute('class');
        container.setAttribute('class', (containerClassName || '') + ' useless-map');
        const ppcmNode = document.createElement('div');
        Object.assign(ppcmNode.style, {
            position: 'absolute',
            width: '1cm',
            height: '1cm',
            backgroundColor: 'transparent',
            pointerEvents: 'none'
        });
        container.appendChild(ppcmNode);
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const selectCanvas = document.createElement('canvas');
        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            margin: '0.25em'
        });
        container.appendChild(toolbar);
        const ctx = canvas.getContext('2d');
        const ctxSelect = selectCanvas.getContext('2d');

        const state = {};

        state.devicePixelRatio = window.devicePixelRatio;
        state.ppcm = ppcmNode.clientWidth;
        state.center = llToProjection(config.center || [0, 0]);
        state.scales = config.scales || [
            500000000,
            250000000,
            100000000,
            75000000,
            50000000,
            25000000,
            10000000,
            7500000,
            5000000,
            2500000,
            1000000,
            750000,
            500000,
            250000,
            100000,
            75000,
            50000,
            25000,
            10000,
            7500,
            5000,
            2500,
            1000,
            750,
            500,
            250,
            100
        ];
        state.zoom = config.zoom || 0;
        state.scale = config.scale || state.scales[state.zoom] || 250000000;
        state.style = config.style || [];
        state.layers = config.layers || [];
        state.upm = 1;
        state.background = config.background || null;
        state.debug = config.debug || false;

        function getResolution() {
            const { ppcm, upm, scale } = state;
            return scale / (ppcm * upm * 100);
        }

        function getBounds(coords, padding) {
            const { resolution, center, width, height } = state;
            const position = coords || center;
            const left = padding && padding[0] !== undefined ? padding[0] : -width / 2;
            const bottom = padding && padding[1] !== undefined ? padding[1] : -height / 2;
            const right = padding && padding[2] !== undefined ? padding[2] : width / 2;
            const top = padding && padding[3] !== undefined ? padding[3] : height / 2;
            return [
                position[0] + left * resolution,
                position[1] + bottom * resolution,
                position[0] + right * resolution,
                position[1] + top * resolution
            ];
        }

        function getBoundingCircle(boundingBox) {
            const halfBoundingBoxWidth = (boundingBox[2] - boundingBox[0]) / 2;
            const halfBoundingBoxHeight = (boundingBox[3] - boundingBox[1]) / 2;
            return [
                [boundingBox[0] + halfBoundingBoxWidth, boundingBox[1] + halfBoundingBoxHeight],
                halfBoundingBoxHeight / Math.sin(Math.atan2(halfBoundingBoxHeight, halfBoundingBoxWidth))
            ];
        }

        function isFeaturePoint(feature) {
            return feature.geometry.type === 'Point' ||
                feature.geometry.type === 'MultiPoint' && feature.geometry.length < 2;
        }

        function isFeatureVisible(feature) {
            const isPoint = isFeaturePoint(feature);
            return isPoint
                ? distance(
                    feature.geometry.type === 'Point' ? feature.geometry.coordinates : feature.geometry.coordinates[0], 
                    state.boundingCircle[0]) < state.boundingCircle[1]
                : distance(feature.boundingCircle[0], state.boundingCircle[0]) < feature.boundingCircle[1] + state.boundingCircle[1];
        }

        function pointInBox(point, box) {
            const [minx, miny, maxx, maxy] = box;
            return point[0] >= minx && point[1] >= miny && point[0] <= maxx && point[1] <= maxy;
        }

        function parseGeoJSONCoordinates(feature, each) {
            switch(feature.geometry.type) {
                case 'Point':
                    const coordinates = each([feature.geometry.coordinates], feature);
                    return coordinates[0];
                case 'MultiPoint':
                    return each(feature.geometry.coordinates, feature);
                case 'LineString':
                    return each(feature.geometry.coordinates, feature);
                case 'MultiLineString':
                    return feature.geometry.coordinates.map(coords => each(coords, feature));
                case 'Polygon':
                    return feature.geometry.coordinates.map(coords => each(coords, feature));
                case 'MultiPolygon':
                    return feature.geometry.coordinates.map(polygon => polygon.map(coords => each(coords, feature)));
                default:
                    return null;
            }
        }

        function splitMultiGeometries(features) {
            return features.reduce((acc, feature) => {
                switch(feature.geometry.type) {
                    case 'MultiPoint':
                        return [
                            ...acc,
                            ...feature.geometry.coordinates.map(coordinates =>({
                                ...feature,
                                geometry: {
                                    type: 'Point',
                                    coordinates
                                }
                            }))
                        ];
                    case 'MultiLineString':
                        return [
                            ...acc,
                            ...feature.geometry.coordinates.map(coordinates =>({
                                ...feature,
                                geometry: {
                                    type: 'LineString',
                                    coordinates
                                }
                            }))
                        ];
                    case 'MultiPolygon':
                        return [
                            ...acc,
                            ...feature.geometry.coordinates.map(coordinates =>({
                                ...feature,
                                geometry: {
                                    type: 'Polygon',
                                    coordinates
                                }
                            }))
                        ];
                    default:
                        return [...acc, feature];
                }
            }, []);
        }

        function handleGeoJSON(layer) {
            const geojson = JSON.parse(JSON.stringify(layer.data));
            const features = geojson.type === 'FeatureCollection'
                ? geojson.features
                : [geojson];
            layer.features = splitMultiGeometries(features).map((feature) => {
                let boundingBox = [Infinity, Infinity, -Infinity, -Infinity];
                const isPoint = isFeaturePoint(feature);
                const newFeature = {
                    ...feature,
                    geometry: {
                        ...feature.geometry,
                        coordinates: parseGeoJSONCoordinates(feature, (coordinates) => {
                            if (isPoint) {
                                boundingBox = null;
                            }
                            return coordinates.map(([lng, lat]) => {
                                const coords = llToProjection([lng, lat]);
                                if (!isPoint) {
                                    if (coords[0] < boundingBox[0]) { boundingBox[0] = coords[0]; }
                                    if (coords[1] < boundingBox[1]) { boundingBox[1] = coords[1]; }
                                    if (coords[0] > boundingBox[2]) { boundingBox[2] = coords[0]; }
                                    if (coords[1] > boundingBox[3]) { boundingBox[3] = coords[1]; }
                                }
                                return coords;
                            });
                        })
                    }
                };
                if (boundingBox && boundingBox !== Infinity) {
                    newFeature.boundingBox = boundingBox;
                    newFeature.boundingCircle = getBoundingCircle(boundingBox);
                }
                return newFeature;
            });
        }

        function updateLayers() {
            state.layers.forEach((layer) => {
                switch(layer.type) {
                    case 'geojson':
                        handleGeoJSON(layer);
                        break;
                    default:
                        break;
                }
            });
        }

        function removeDuplicateCoordinates(coords) {
            return coords.reduce((acc, vertex, idx) => {
                const prevVertex = acc[idx - 1];
                if (prevVertex && vertex[0] === prevVertex[0] && vertex[1] === prevVertex[1]) {
                    return acc;
                }
                acc.push(vertex);
                return acc;
            }, []);
        }

        function draw(each) {
            let cacheLayers = {};
            state.layers.forEach(layer => {
                layer.features.forEach((feature) => {
                    feature.geometry.drawCoordinates = undefined;
                    feature.isVisible = undefined;
                });
            });
            state.style.forEach(style => {
                const layer = state.layers.find(layer => layer.id === style.layer);
                if (layer) {
                    (cacheLayers[layer.id]  || layer).features.forEach((feature) => {
                        const isVisible = feature.isVisible === undefined
                            ? !!isFeatureVisible(feature)
                            : feature.isVisible;
                        if (isVisible) {
                            if (!feature.geometry.drawCoordinates) {
                                const drawCoordinates = parseGeoJSONCoordinates(feature, (coords) => removeDuplicateCoordinates(coords.map(([x, y]) => {
                                    const [minx, miny, maxx, maxy] = state.bounds;
                                    return [
                                        Math.round(mapValue(x, minx, maxx, 0, state.width)),
                                        Math.round(mapValue(y, miny, maxy, state.height, 0)),
                                    ];
                                })));
                                feature.geometry.drawCoordinates = drawCoordinates;
                                feature.isVisible = isVisible;
                            }
                            each(feature, style);
                        }
                    });
                    cacheLayers[layer.id] = layer;
                }
            });
        }

        function resize(options) {
            state.width = options.width * state.devicePixelRatio;
            state.height = options.height * state.devicePixelRatio;
            state.resolution = getResolution();
            state.bounds = getBounds();
            state.boundingCircle = getBoundingCircle(state.bounds);

            canvas.setAttribute('width', state.width);
            canvas.setAttribute('height', state.height);
            Object.assign(canvas.style, {
                position: 'absolute',
                top: 0,
                left: 0,
                width: state.width + 'px',
                height: state.height + 'px'
            });
            selectCanvas.setAttribute('width', state.width);
            selectCanvas.setAttribute('height', state.height);
            Object.assign(selectCanvas.style, {
                position: 'absolute',
                top: 0,
                left: 0,
                width: state.width + 'px',
                height: state.height + 'px'
            });
        }

        resize(container.getBoundingClientRect());
        updateLayers();

        const resizeObserver = new window.ResizeObserver((entries) => {
            const { contentRect } = entries[0];
            resize(contentRect);
        });

        resizeObserver.observe(container);


        function path(ctx, coordinates, style, close) {
            ctx.beginPath();
            if (style.fill) {
                ctx.fillStyle = style.fill;
            }
            if (style.stroke) {
                ctx.strokeStyle = style.stroke;
                ctx.lineCap = 'round';
            }
            if (style.strokeWidth !== undefined) {
                ctx.lineWidth = style.strokeWidth;
            }
            coordinates.forEach(coords => {
                coords.forEach(([x, y], idx) => {
                    if (idx === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
            });
            if (style.fill) {
                ctx.fill('evenodd');
            }
            if (style.stroke) {
                ctx.stroke();
            }
            if (close) {
                ctx.closePath();
            }
        }
        function point(ctx, coordinates, style) {
            ctx.beginPath();
            if (style.fill) {
                ctx.fillStyle = style.fill;
            }
            if (style.stroke) {
                ctx.strokeStyle = style.stroke;
            }
            if (style.strokeWidth) {
                ctx.lineWidth = style.strokeWidth;
            }
            ctx.arc(coordinates[0], coordinates[1], style.size / 2 || 8, 0, 2 * Math.PI);
            if (style.fill) {
                ctx.fill();
            }
            if (style.stroke) {
                ctx.stroke();
            }
        }

        function paintSelection(point, feature) {
            const coordinates = feature.geometry.drawCoordinates;
            const style = { fill: '#000000' };
            ctxSelect.clearRect(0, 0, state.width, state.height);
            switch(feature.geometry.type) {
                case 'Point':
                    point(ctxSelect, coordinates, style);
                    break;
                case 'MultiPoint':
                    coordinates.forEach(coords => {
                        point(ctxSelect, coords, style);
                    });
                    break;
                case 'LineString':
                    path(ctxSelect, [coordinates], style, false);
                    break;
                case 'MultiLineString':
                    coordinates.forEach(coords => {
                        path(ctxSelect, [coords], style, false);
                    });
                    break;
                case 'Polygon':
                    path(ctxSelect, coordinates, style, true);
                    break;
                case 'MultiPolygon':
                    coordinates.forEach(coords => {
                        path(ctxSelect, coords, style, true);
                    });
                    break;
                default:
                    break;
            }
            const [r, g, b, a] = ctxSelect.getImageData(point[0] - 0.5, point[1] - 0.5, 1, 1).data;
            return !!(r === 0 && g === 0 && b === 0 && a === 255);
        }

        function getFeaturesAtPoint(point) {
            const [minx, miny, maxx, maxy] = state.bounds;
            const coords = [
                mapValue(point[0], 0, state.width, minx, maxx),
                mapValue(point[1], 0, state.height, maxy, miny)
            ];
            const features = state.layers
                .reduce((acc, layer) => [...acc, ...layer.features], [])
                .filter(isFeatureVisible)
                .filter(feature => isFeaturePoint(feature)
                    ? false // TODO
                    : pointInBox(coords, feature.boundingBox))
                .filter((feature) => paintSelection(point, feature));
            return features;
        }

        function getToolsOptions() {
            return {
                state,
                container,
                canvas,
                toolbar,
                pan,
                zoom,
                getPosition,
                draw,
                getFeaturesAtPoint,
                pointInBox,
                mapValue,
                distance,
                parseGeoJSONCoordinates,
                lerp,
                isFeaturePoint,
                getBoundingCircle
            };
        }

        const animate = function () {
            requestAnimationFrame( animate );
            if (state.background) {
                if (state.background.colors) {
                    const gradient = state.background.direction === 'vertical'
                        ? ctx.createLinearGradient(0, 0, 0, state.height)
                        : ctx.createLinearGradient(0, 0, state.width, 0);
                    state.background.colors.forEach((color, idx) => {
                        gradient.addColorStop(idx / (state.background.colors.length - 1), color);
                    });
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = state.background;
                }
                
                ctx.fillRect(0, 0, state.width, state.height);
            } else {
                ctx.clearRect(0, 0, state.width, state.height);
            }
            draw((feature, style) => {
                const coordinates = feature.geometry.drawCoordinates;
                switch(feature.geometry.type) {
                    case 'Point':
                        point(ctx, coordinates, style);
                        break;
                    case 'MultiPoint':
                        coordinates.forEach(coords => {
                            point(ctx, coords, style);
                        });
                        break;
                    case 'LineString':
                        path(ctx, [coordinates], style, false);
                        break;
                    case 'MultiLineString':
                        coordinates.forEach(coords => {
                            path(ctx, [coords], style, false);
                        });
                        break;
                    case 'Polygon':
                        path(ctx, coordinates, style, true);
                        break;
                    case 'MultiPolygon':
                        coordinates.forEach(coords => {
                            path(ctx, coords, style, true);
                        });
                        break;
                    default:
                        break;
                }

                if (state.debug && feature.boundingCircle) {
                    const [minx, miny, maxx, maxy] = state.bounds;
                    ctx.beginPath();
                    const [center, radius] = feature.boundingCircle;
                    ctx.strokeStyle = '#ff0000';
                    ctx.arc(
                        Math.round(mapValue(center[0], minx, maxx, 0, state.width)),
                        Math.round(mapValue(center[1], miny, maxy, state.height, 0)),
                        radius / state.resolution,
                        0, 2 * Math.PI
                    );
                    ctx.stroke();
                }
            });
            tools.forEach(tool => {
                if (tool && tool.draw) {
                    tool.draw(getToolsOptions());
                }
            });
        };
    
        animate();

        function pan([deltaX, deltaY]) {
            state.center = [
                state.center[0] + deltaX * state.resolution,
                state.center[1] + deltaY * state.resolution
            ];
            state.bounds = getBounds();
            state.boundingCircle = getBoundingCircle(state.bounds);
        }
        function zoom(deltaZoom, [x, y]) {
            if (state.scales[state.zoom + deltaZoom]) {
                const [minx, miny, maxx, maxy] = state.bounds;
                const position = [
                    mapValue(x, 0, state.width, minx, maxx),
                    mapValue(y, 0, state.height, maxy, miny)
                ];
                const padding = [
                    -x,
                    -(state.height - y),
                    state.width - x,
                    y
                ];
                state.zoom = state.zoom + deltaZoom;
                state.scale = state.scales[state.zoom];
                state.resolution = getResolution();
                state.bounds = getBounds(position, padding);
                state.boundingCircle = getBoundingCircle(state.bounds);
                state.center = [
                    state.bounds[0] + Math.abs(state.bounds[2] - state.bounds[0]) / 2,
                    state.bounds[1] + Math.abs(state.bounds[3] - state.bounds[1]) / 2
                ];
            }
        }
        function pointerStart(event) {
            state.panning = true;
            state.pan = getPosition(event);
        }
        function pointerMove(event) {
            if (state.panning) {
                const position = getPosition(event);
                const deltaX = state.pan[0] - position[0];
                const deltaY = position[1] - state.pan[1];
                pan([deltaX, deltaY]);
                state.pan = position;
            }
            state.mouse = getPosition(event);
        }
        function pointerEnd() {
            state.panning = false;
        }

        function wheel(event) {
            const position = getPosition(event);
            zoom(-Math.sign(event.deltaY), position);
        }

        container.addEventListener('mousedown', pointerStart);
        container.addEventListener('mousemove', pointerMove);
        container.addEventListener('mouseup', pointerEnd);
        container.addEventListener('mouseout', pointerEnd);

        container.addEventListener('wheel', wheel);

        container.addEventListener('touchstart', pointerStart);
        container.addEventListener('touchmove', pointerMove);
        container.addEventListener('touchend', pointerEnd);

        this.addTool = (tool) => {
            tools.push(tool);
            if (tool.setup) {
                tool.setup(getToolsOptions());
            }
        };
    }

    window.UselessMap = {
        setup: (config) => new UselessMap(config)
    };

})();
