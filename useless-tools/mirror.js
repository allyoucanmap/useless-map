/* copyright 2021, stefano bovio @allyoucanmap. */

(function() {
    function Mirror() {

        const mirrorCanvas = document.createElement('canvas');

        let active = false;

        function setup(event) {
            const button = document.createElement('button');
            button.innerHTML = '⏀';
            event.toolbar.appendChild(button);
            button.setAttribute('class', 'icon');
            button.addEventListener('click', () => {
                active = !active;
                button.setAttribute('class', active ? 'icon active' : 'icon');
            });
        }

        function draw(event) {
            if (active) {
                const { canvas } = event;
                const ctx = canvas.getContext('2d');
                mirrorCanvas.width = canvas.width;
                mirrorCanvas.height = canvas.height;
                const mirrorCtx = mirrorCanvas.getContext('2d');
                mirrorCtx.save();
                mirrorCtx.scale(-1, 1);
                mirrorCtx.drawImage(canvas, 0, 0, canvas.width * -1, canvas.height);
                mirrorCtx.restore();
                ctx.drawImage(mirrorCanvas,
                    0, 0, canvas.width / 2, canvas.height,
                    0, 0, canvas.width / 2, canvas.height);

                ctx.beginPath();
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 0.4;
                ctx.moveTo(canvas.width / 2, 0);
                ctx.lineTo(canvas.width / 2, canvas.height);
                ctx.stroke();
            }
        }
        this.name = 'mirror';
        this.setup = setup;
        this.draw = draw;
    }
    window.UselessMap.mirror = (config) => new Mirror(config);
})();
