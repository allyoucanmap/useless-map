/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Eyes() {

        let active = false;

        const colors = [
            '#adce79',
            '#a7d0ec',
            '#8c5e0a',
            '#cc91f1'
        ];

        function setup(event) {
            const button = document.createElement('button');
            button.innerHTML = '👁';
            event.toolbar.appendChild(button);
            button.setAttribute('class', 'icon');
            button.addEventListener('click', () => {
                active = !active;
                button.setAttribute('class', active ? 'icon active' : 'icon');
            });
            event.container.addEventListener('dblclick', (ev) => {
                if (!event.state.panning && active) {
                    const position = event.getPosition(ev);
                    (event.getFeaturesAtPoint(position) || []).forEach(feature => {
                        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                            feature.eyes = !feature.eyes
                                ? colors[Math.round(Math.random() * (colors.length - 1))]
                                : false;
                        }
                    });
                }
            });
        }

        function getPupilDelta(center, mouse, factor) {
            const angle = Math.atan2(mouse[0] - center[0], mouse[1] - center[1]);
            return [factor * Math.sin(angle), factor * Math.cos(angle)];
        }

        function drawEye(ctx, center, size, delta, open, color) {
            const [x, y] = center;
            const [deltaX, deltaY] = delta;

            ctx.beginPath();
            ctx.fillStyle = '#d65c5c';
            ctx.moveTo(x - size / 2, y);
            ctx.bezierCurveTo(
                x - size / 2, y - size / 2,
                x + size / 2, y - size / 2,
                x + size / 2, y
            );
            ctx.lineTo(x + size / 2, y);
            ctx.bezierCurveTo(
                x + size / 2, y + size / 2,
                x - size / 2, y + size / 2,
                x - size / 2, y
            );
            ctx.fill();

            ctx.beginPath();
            const gradient = ctx.createRadialGradient(
                x + deltaX, y + deltaY, size / 8,
                x, y, size / 2.5
            );
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.9, '#dddddd');
            gradient.addColorStop(1, '#aaaaaa');
            ctx.fillStyle = gradient;
            ctx.lineWidth = 2;
            ctx.arc(x, y, size / 2.5, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x + deltaX, y + deltaY, size / 4, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = '#333333';
            ctx.arc(x + deltaX, y + deltaY, size / 8, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.arc(x + deltaX + size / 20, y + deltaY - size / 20, size / 24, 0, 2 * Math.PI);
            ctx.fill();

            ctx.beginPath();
            ctx.fillStyle = '#ddd';
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = size / 32;
            ctx.moveTo(x - size / 2, y);
            ctx.bezierCurveTo(
                x - size / 2, y - size / 1.8,
                x + size / 2, y - size / 1.8,
                x + size / 2, y
            );
            ctx.lineTo(x + size / 2, y);
            ctx.bezierCurveTo(
                x + size / 2, y - size / open,
                x - size / 2, y - size / open,
                x - size / 2, y
            );
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.fillStyle = '#ddd';
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = size / 32;
            ctx.moveTo(x - size / 2, y);
            ctx.bezierCurveTo(
                x - size / 2, y + size / 1.8,
                x + size / 2, y + size / 1.8,
                x + size / 2, y
            );
            ctx.lineTo(x + size / 2, y);
            ctx.bezierCurveTo(
                x + size / 2, y + size / open,
                x - size / 2, y + size / open,
                x - size / 2, y
            );
            ctx.fill();
            ctx.stroke();
        }

        function draw(event) {
            if (active) {
                const { canvas, state, mapValue } = event;
                const { mouse, bounds, width, height } = state;
                const ctx = canvas.getContext('2d');
                event.draw((feature) => {
                    if (feature.eyes && feature.boundingCircle) {
                        const [minx, miny, maxx, maxy] = bounds;
                        const size = 48;
                        const center = feature.boundingCircle[0];
                        const x = mapValue(center[0], minx, maxx, 0, width);
                        const y = mapValue(center[1], miny, maxy, height, 0);
                        const distance = event.distance([x, y], mouse);
                        const isOver = mouse && distance < size * 2 && distance > size
                            ? 4
                            : distance <= size
                            ? 8
                            : false;

                        const delta = getPupilDelta([x, y], mouse, 5);
                        drawEye(ctx, [x + size / 2, y], size, delta, isOver || 2.5, feature.eyes);
                        drawEye(ctx, [x - size / 2, y], size, delta, isOver || 2.5, feature.eyes);
                    }
                });
            }
            
        }
        this.name = 'eyes';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.eyes = (config) => new Eyes(config);
})();
